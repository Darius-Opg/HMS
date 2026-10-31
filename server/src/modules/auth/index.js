
//this is the auth module, which handles user authentication and authorization
// it provides functions that can be used by the routes to handle authentication and authorization logic
import crypto from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import prisma from "../database/index.js";
import { findByEmailForAuth, getUserById } from "../users/index.js";
import { clearAuthCookies, setAuthCookies } from './cookies.js';
import { authLimiter } from './rateLimit.js';
import { logActivity, logError } from '../audit/logActivity.js';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
const ACCESS_TOKEN_TTL_MINUTES = process.env.JWT_ACCESS_TTL_MINUTES || 15;
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);

if (!ACCESS_TOKEN_SECRET) {
    throw new Error("JWT_ACCESS_SECRET must be defined");
}

function signAccessToken(user) {
    return jwt.sign(
        { sub: user.id, role: user.role, permissions: user.permissions },
        ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL_MINUTES * 60 }
    )
}

function hashToken(raw) {
    return crypto.createHash('sha256').update(raw).digest('hex');
}

async function issueRefreshToken(userId) {
    const raw = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
        data: {
            userId,
            tokenHash: hashToken(raw),
            expiresAt
        }
    });
    return raw;
}



export async function login(email, password) {
    if (!email || !password) {
        throw new Error("Email and password are required");
    }
    try {
        const user = await findByEmailForAuth(email);
        if (!user) {
            throw new Error("User does not exist in database");
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            throw new Error("Invalid credentials");
        }

        const safeUser = await getUserById(user.id);
        const accessToken = signAccessToken(safeUser);
        const refreshToken = await issueRefreshToken(user.id);

        return { accessToken, refreshToken, user: safeUser };
    }
    catch (error) {
        logError('auth login', error);
        throw error;
    }
}

//refreshing revokes the current token and issues new one 
// if the provided token has been revocked already 
// the function will revoke all other tokens for the user and throw an error
export async function refresh(rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await prisma.refreshToken.findUnique({
        where: { tokenHash },
    })

    if (!stored || stored.expiresAt < new Date() || stored.revokedAt) {
        if (stored?.revokedAt) {
            const { count } = await prisma.refreshToken.updateMany({
                where: { id: stored.id, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            if (count === 0) throw new Error('Invalid refresh token');
        }
        throw new Error('Invalid refresh token');
    }

    await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
    });

    const user = await getUserById(stored.userId);
    const accessToken = signAccessToken(user);
    const newRefreshToken = await issueRefreshToken(stored.userId);

    return { accessToken, refreshToken: newRefreshToken, user };
}

export async function logout(rawRefreshToken) {
    try {
        await prisma.refreshToken.updateMany({
            where: { tokenHash: hashToken(rawRefreshToken), revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    catch (error) {
        logError('auth logout', error);
    }
}


//http routes for authentication and authorization
//exported to be used in the main app.js file

export const router = express.Router();

router.post('/reset-password', async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!token || password.length < 8) {
        return res.status(400).json({ error: 'A reset token and a password of at least 8 characters are required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const now = new Date();
    try {
        const resetRecord = await prisma.passwordResetToken.findUnique({
            where: { tokenHash },
            select: { id: true, userId: true, expiresAt: true, usedAt: true },
        });
        if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt <= now) {
            return res.status(400).json({ error: 'This password reset link is invalid or has expired' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        await prisma.$transaction(async (transaction) => {
            const claim = await transaction.passwordResetToken.updateMany({
                where: { id: resetRecord.id, usedAt: null, expiresAt: { gt: now } },
                data: { usedAt: now },
            });
            if (claim.count !== 1) throw new Error('This password reset link is invalid or has expired');

            const user = await transaction.user.findUnique({
                where: { id: resetRecord.userId },
                select: { id: true, isActive: true, isDelete: true },
            });
            if (!user || !user.isActive || user.isDelete) throw new Error('This account cannot reset its password');

            await transaction.user.update({ where: { id: user.id }, data: { password: passwordHash } });
            await transaction.refreshToken.updateMany({
                where: { userId: user.id, revokedAt: null },
                data: { revokedAt: now },
            });
            await transaction.passwordResetToken.deleteMany({ where: { userId: user.id } });
        });

        await logActivity({
            action: 'USER_PASSWORD_RESET',
            entityType: 'USER',
            entityId: resetRecord.userId,
            performedById: resetRecord.userId,
        });
        res.json({ message: 'Password updated. You can now sign in with your new password.' });
    } catch (error) {
        logError('password reset', error);
        res.status(400).json({ error: 'Could not reset password. The link may have expired.' });
    }
});

router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const { accessToken, refreshToken, user } = await login(email, password);
        await logActivity({
            action: 'USER_LOGIN',
            entityType: 'USER',
            entityId: user.id,
            performedById: user.id,
            metadata: { role: user.role },
        });
        setAuthCookies(res, accessToken, refreshToken);
        res.status(200).json({ user, accessToken });
    }
    catch {
        res.status(401).json({ error: 'Invalid Credentials' })
    }
})

router.post('/refresh', async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    try {
        const { accessToken, refreshToken, user } = await refresh(token);
        setAuthCookies(res, accessToken, refreshToken);
        res.json({ accessToken, user });
    } catch (err) {
        logError('auth refresh', err);
        clearAuthCookies(res);
        res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});

router.post('/logout', async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (token) await logout(token);
    const accessToken = req.cookies?.accessToken
        ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (accessToken) {
        try {
            const payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
            await logActivity({
                action: 'USER_LOGOUT',
                entityType: 'USER',
                entityId: payload.sub,
                performedById: payload.sub,
            });
        } catch {
            // Expired access tokens cannot be associated with a user.
        }
    }
    clearAuthCookies(res);
    res.status(204).end();
});
