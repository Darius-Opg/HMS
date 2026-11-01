import express from 'express';
import prisma from '../database/index.js';
import { logActivity, logError } from '../audit/logActivity.js';
import { requireAuth, requirePermission } from '../auth/access.js';

const REPORT_TYPES = new Set(['RESERVATIONS', 'GUESTS', 'ROOMS', 'PAYMENTS']);
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const router = express.Router();

router.use(requireAuth, requirePermission('VIEW_REPORTS'));

function handle(fn) {
    return async (req, res) => {
        try {
            await fn(req, res);
        } catch (error) {
            if (error.status) {
                return res.status(error.status).json({ error: error.message });
            }
            logError('reports module', error);
            return res.status(500).json({ error: 'Could not load report data.' });
        }
    };
}

function badRequest(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function parseDateRange(fromValue, toValue) {
    const isDate = (value) => (
        typeof value === 'string'
        && /^\d{4}-\d{2}-\d{2}$/.test(value)
        && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
        && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
    );

    if (!isDate(fromValue) || !isDate(toValue)) {
        throw badRequest('Provide valid from and to dates in YYYY-MM-DD format.');
    }

    const start = new Date(`${fromValue}T00:00:00.000Z`);
    const end = new Date(`${toValue}T00:00:00.000Z`);
    if (start > end) {
        throw badRequest('The start date must be on or before the end date.');
    }
    if ((end.getTime() - start.getTime()) / DAY_IN_MS > 366) {
        throw badRequest('The date range cannot exceed 367 days.');
    }

    const endExclusive = new Date(end.getTime() + DAY_IN_MS);
    return { from: fromValue, to: toValue, start, endExclusive };
}

function parseReportType(value) {
    const type = typeof value === 'string' ? value.toUpperCase() : '';
    if (!REPORT_TYPES.has(type)) {
        throw badRequest(`Invalid report type. Allowed: ${[...REPORT_TYPES].join(', ')}.`);
    }
    return type;
}

async function buildDashboard(range) {
    const period = { gte: range.start, lt: range.endExclusive };
    const [reservations, guests, payments, totalRooms, occupiedRooms] = await Promise.all([
        prisma.reservation.findMany({
            where: { checkInDate: period },
            select: { checkInDate: true },
        }),
        prisma.guest.count({ where: { createdAt: period } }),
        prisma.invoice.findMany({
            where: { updatedAt: period },
            select: { updatedAt: true, amountPaid: true },
        }),
        prisma.room.count(),
        prisma.room.count({ where: { status: 'OCCUPIED' } }),
    ]);

    const daily = new Map();
    for (let date = range.start; date < range.endExclusive; date = new Date(date.getTime() + DAY_IN_MS)) {
        daily.set(date.toISOString().slice(0, 10), { date: date.toISOString().slice(0, 10), reservations: 0, payments: 0 });
    }

    for (const reservation of reservations) {
        const key = reservation.checkInDate.toISOString().slice(0, 10);
        const point = daily.get(key);
        if (point) point.reservations += 1;
    }
    for (const payment of payments) {
        const key = payment.updatedAt.toISOString().slice(0, 10);
        const point = daily.get(key);
        if (point) point.payments += Number(payment.amountPaid);
    }

    return {
        period: { from: range.from, to: range.to },
        summary: {
            totalReservations: reservations.length,
            totalGuests: guests,
            totalRevenue: payments.reduce((total, payment) => total + Number(payment.amountPaid), 0),
            occupancyRate: totalRooms === 0 ? 0 : Math.round((occupiedRooms / totalRooms) * 100),
        },
        timeline: [...daily.values()],
    };
}

async function buildReport(type, range) {
    const period = { gte: range.start, lt: range.endExclusive };
    switch (type) {
        case 'RESERVATIONS': {
            const rows = await prisma.reservation.findMany({
                where: { checkInDate: period },
                orderBy: { checkInDate: 'desc' },
                include: {
                    guest: { select: { firstName: true, lastName: true } },
                    room: { select: { roomNumber: true, roomType: { select: { name: true } } } },
                    invoice: { select: { totalAmount: true, amountPaid: true, paymentStatus: true } },
                },
            });
            return rows.map(({ id, checkInDate, checkOutDate, status, guest, room, invoice }) => ({
                id,
                checkInDate,
                checkOutDate,
                guest: [guest.firstName, guest.lastName].filter(Boolean).join(' '),
                room: room.roomNumber,
                roomType: room.roomType.name,
                status,
                totalAmount: Number(invoice?.totalAmount ?? 0),
                amountPaid: Number(invoice?.amountPaid ?? 0),
                paymentStatus: invoice?.paymentStatus ?? 'PENDING',
            }));
        }
        case 'GUESTS': {
            const rows = await prisma.guest.findMany({
                where: { createdAt: period },
                orderBy: { createdAt: 'desc' },
                include: { _count: { select: { reservations: true } } },
            });
            return rows.map(({ id, firstName, lastName, email, loyaltyTier, createdAt, _count }) => ({
                id,
                name: [firstName, lastName].filter(Boolean).join(' '),
                email: email ?? '',
                loyaltyTier,
                reservations: _count.reservations,
                createdAt,
            }));
        }
        case 'ROOMS': {
            const rows = await prisma.room.findMany({
                orderBy: { roomNumber: 'asc' },
                include: { roomType: { select: { name: true } } },
            });
            return rows.map(({ id, roomNumber, floor, status, roomType }) => ({
                id,
                roomNumber,
                roomType: roomType.name,
                floor: floor ?? '',
                status,
            }));
        }
        case 'PAYMENTS': {
            const rows = await prisma.invoice.findMany({
                where: { updatedAt: period },
                orderBy: { updatedAt: 'desc' },
                include: {
                    reservation: {
                        select: {
                            guest: { select: { firstName: true, lastName: true } },
                            room: { select: { roomNumber: true } },
                        },
                    },
                },
            });
            return rows.map(({ id, updatedAt, totalAmount, amountPaid, paymentStatus, reservation }) => ({
                id,
                updatedAt,
                guest: [reservation.guest.firstName, reservation.guest.lastName].filter(Boolean).join(' '),
                room: reservation.room.roomNumber,
                totalAmount: Number(totalAmount),
                amountPaid: Number(amountPaid),
                paymentStatus,
            }));
        }
        default:
            throw badRequest('This report type is not available.');
    }
}

router.get('/dashboard', handle(async (req, res) => {
    res.json(await buildDashboard(parseDateRange(req.query.from, req.query.to)));
}));

router.get('/data', handle(async (req, res) => {
    const type = parseReportType(req.query.type);
    const range = parseDateRange(req.query.from, req.query.to);
    const rows = await buildReport(type, range);
    res.json({ type, period: { from: range.from, to: range.to }, rows });
}));

router.post('/generate', handle(async (req, res) => {
    const type = parseReportType(req.body?.type);
    const range = parseDateRange(req.body?.from, req.body?.to);
    const rows = await buildReport(type, range);
    const generatedAt = new Date();
    await logActivity({
        action: 'REPORT_GENERATED',
        entityType: 'REPORT',
        performedById: req.user.id,
        metadata: { type, from: range.from, to: range.to },
    });
    res.json({
        type,
        period: { from: range.from, to: range.to },
        generatedAt,
        rows,
    });
}));

router.get('/recent', handle(async (req, res) => {
    const logs = await prisma.auditLog.findMany({
        where: { action: 'REPORT_GENERATED' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { performedBy: { select: { name: true } } },
    });
    res.json(logs
        .map(({ id, metadata, createdAt, performedBy }) => ({
            id,
            type: metadata?.type ?? '',
            from: metadata?.from ?? '',
            to: metadata?.to ?? '',
            generatedAt: createdAt,
            generatedBy: performedBy?.name ?? 'System',
        }))
        .filter(({ type }) => REPORT_TYPES.has(type)));
}));
