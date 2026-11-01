import express from 'express';
import prisma from '../database/index.js';
import { logError } from './logActivity.js';
import { requireAuth, requirePermission } from '../auth/access.js';

export const router = express.Router();

router.use(requireAuth, (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Audit logs are only available to administrators.' });
    }
    return next();
}, requirePermission('VIEW_AUDIT_LOG'));

function parseDate(value, label) {
    if (value === undefined) return undefined;
    if (
        typeof value !== 'string'
        || !/^\d{4}-\d{2}-\d{2}$/.test(value)
        || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
        || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value
    ) {
        const error = new Error(`${label} must be a valid YYYY-MM-DD date.`);
        error.status = 400;
        throw error;
    }
    return new Date(`${value}T00:00:00.000Z`);
}

router.get('/', async (req, res) => {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 50);
        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
            return res.status(400).json({ error: 'Page must be positive and limit must be between 1 and 100.' });
        }

        const from = parseDate(req.query.from, 'from');
        const to = parseDate(req.query.to, 'to');
        if (from && to && from > to) {
            return res.status(400).json({ error: 'The start date must be on or before the end date.' });
        }

        const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
        const where = {
            ...(from || to) && {
                createdAt: {
                    ...(from && { gte: from }),
                    ...(to && { lt: new Date(to.getTime() + 24 * 60 * 60 * 1000) }),
                },
            },
            ...(search && {
                OR: [
                    { action: { contains: search, mode: 'insensitive' } },
                    { entityType: { contains: search, mode: 'insensitive' } },
                    { entityId: { contains: search, mode: 'insensitive' } },
                    { performedBy: { is: { name: { contains: search, mode: 'insensitive' } } } },
                ],
            }),
        };
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    action: true,
                    entityType: true,
                    entityId: true,
                    metadata: true,
                    createdAt: true,
                    performedBy: { select: { name: true } },
                },
            }),
            prisma.auditLog.count({ where }),
        ]);
        res.json({
            items: logs.map(({ performedBy, ...log }) => ({
                ...log,
                performedBy: performedBy?.name ?? 'System',
            })),
            page,
            limit,
            total,
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        logError('audit logs module', error);
        return res.status(500).json({ error: 'Could not load audit logs.' });
    }
});
