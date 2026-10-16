
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
        console.error('login failed:', error); // temporary, remove once resolved
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
        // Log the error for debugging purposes
    }
}


//http routes for authentication and authorization
//exported to be used in the main app.js file

export const router = express.Router();

router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const { accessToken, refreshToken, user } = await login(email, password);
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
        console.error('refresh failed:', err.message);
        clearAuthCookies(res);
        res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});

router.post('/logout', async (req, res) => {
    const token = req.cookies?.refreshToken;
    if (token) await logout(token);
    clearAuthCookies(res);
    res.status(204).end();
});
