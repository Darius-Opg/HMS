import express from 'express';
import bcrypt from "bcrypt";
import prisma from "../database/index.js";
import { encrypt, hash } from "../security/index.js";
import { requireAuth, requirePermission } from "../auth/access.js";

const SALT_ROUNDS = 12;

const DEFAULT_PERMISSIONS = {
    ADMIN: [
        'MANAGE_ROOMS',
        'MANAGE_USERS',
        'MANAGE_GUESTS',
        'MANAGE_BILLING',
        'VIEW_REPORTS',
        'MANAGE_RESERVATIONS',
        'VIEW_AUDIT_LOG',
    ],
    STAFF: [
        'MANAGE_RESERVATIONS',
        'MANAGE_GUESTS',
    ]
}

export async function createUser({ name, email, phone, password, idNumber, role = 'STAFF', permissions }) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const grantedPermissions = permissions ?? DEFAULT_PERMISSIONS[role] ?? [];
    try {
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: passwordHash,
                role,
                permissions: grantedPermissions,
                idNumberEncrypted: encrypt(idNumber),
                idNumberHash: hash(idNumber),
                phoneEncrypted: encrypt(phone),
                phoneHash: hash(phone),
            }
        })
        return newUser;
    }
    catch (error) {
        // TODO: logging
        throw error;
    }
}

export async function findByEmailForAuth(email) {
    try {
        return prisma.user.findFirst({
            where: { email, isActive: true, isDelete: false },
            omit: { password: false },
        });
    } catch (error) {
        // TODO: logging
        throw error;

    }
}


export async function listUsers() {
    return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function updateUser(id, { name, email, role, permissions }) {
    return prisma.user.update({
        where: { id },
        data: { name, email, role, permissions },
    });
}

export async function deactivateUser(id, reason) {
    if (!reason) throw new Error('A reason is required to deactivate a user');
    return prisma.user.update({
        where: { id },
        data: { isActive: false, deactivatedAt: new Date(), deactivationReason: reason },
    });
}

export async function reactivateUser(id) {
    return prisma.user.update({
        where: { id },
        data: { isActive: true, deactivatedAt: null, deactivationReason: null },
    });
}

export async function softDeleteUser(id, reason) {
    if (!reason) throw new Error('A reason is required to delete a user');
    return prisma.user.update({
        where: { id },
        data: { isDelete: true, deletedAt: new Date(), deletionReason: reason },
    });
}

export async function getUserById(id) {
    try {
        return await prisma.user.findUnique({
            where: { id },
        });
    }
    catch (error) {
        // TODO: logging
        throw error;
    }
}


















export const router = express.Router()

router.use(requireAuth, requirePermission('MANAGE_USERS'));

router.post('/', async (req, res) => {
    const { name, email, phone, idNumber, password, role, permissions } = req.body;
    if (!name || !email || !phone || !idNumber || !password) {
        return res.status(400).json({ error: 'name, email, phone, idNumber, and password are required' });
    }

    try {
        const user = await createUser({ name, email, phone, idNumber, password, role, permissions });
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: 'Could not create user', detail: err.message });
    }
});

router.get('/', async (req, res) => {
    res.json(await listUsers());
});

router.get('/:id', async (req, res) => {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

router.patch('/:id', async (req, res) => {
    const { name, email, role, permissions } = req.body;
    try {
        const user = await updateUser(req.params.id, { name, email, role, permissions });
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: 'Could not update user', detail: err.message });
    }
});

router.post('/:id/deactivate', async (req, res) => {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'reason is required' });

    try {
        const user = await deactivateUser(req.params.id, reason);
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: 'Could not deactivate user', detail: err.message });
    }
});

router.post('/:id/reactivate', async (req, res) => {
    try {
        const user = await reactivateUser(req.params.id);
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: 'Could not reactivate user', detail: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'reason is required' });

    try {
        const user = await softDeleteUser(req.params.id, reason);
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: 'Could not delete user', detail: err.message });
    }
});