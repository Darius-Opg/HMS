import express from 'express';
import prisma from '../database/index.js';
import { Prisma } from '../../generated/prisma/index.js';
import { requireAuth, requirePermission } from '../auth/access.js';
import { assertUuid, httpError } from '../rooms/roomHelper.js';
import { logActivity, logError } from '../audit/logActivity.js';

export const router = express.Router();
router.use(requireAuth, requirePermission('MANAGE_BILLING'));

const handle = (fn) => async (req, res) => {
    try { await fn(req, res); }
    catch (error) {
        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === 'P2025') return res.status(404).json({ error: 'Invoice not found' });
        if (error.code === 'P2002') return res.status(409).json({ error: 'A billing record already exists' });
        logError('billing module', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

router.get('/reservation/:reservationId', handle(async (req, res) => {
    assertUuid(req.params.reservationId, 'reservationId');
    const invoice = await prisma.invoice.findUnique({
        where: { reservationId: req.params.reservationId },
        include: { reservation: { include: { guest: { select: { id: true, firstName: true, lastName: true } }, room: { select: { roomNumber: true } } } } },
    });
    if (!invoice) throw httpError(404, 'Invoice not found');
    res.json(invoice);
}));

router.get('/guest/:guestId', handle(async (req, res) => {
    assertUuid(req.params.guestId, 'guestId');
    const invoices = await prisma.invoice.findMany({
        where: { reservation: { guestId: req.params.guestId } },
        orderBy: { createdAt: 'desc' },
        include: { reservation: { include: { room: { select: { roomNumber: true } } } } },
    });
    res.json(invoices);
}));

router.post('/payments', handle(async (req, res) => {
    const { reservationId, amount } = req.body ?? {};
    assertUuid(reservationId, 'reservationId');
    if (!(typeof amount === 'string' || typeof amount === 'number') || !/^\d+(\.\d{1,2})?$/.test(String(amount))) {
        throw httpError(400, 'amount must be a positive decimal with at most two fractional digits');
    }
    const payment = new Prisma.Decimal(String(amount));
    if (!payment.isFinite() || payment.lte(0)) throw httpError(400, 'amount must be greater than zero');

    const invoice = await prisma.$transaction(async (tx) => {
        const current = await tx.invoice.findUnique({ where: { reservationId } });
        if (!current) throw httpError(404, 'Invoice not found');
        const due = new Prisma.Decimal(current.totalAmount);
        const paid = new Prisma.Decimal(current.amountPaid);
        if (paid.plus(payment).gt(due)) throw httpError(409, 'Payment exceeds the outstanding balance');
        const newPaid = paid.plus(payment);
        const status = newPaid.gte(due) ? 'PAID' : 'PARTIAL';
        return tx.invoice.update({
            where: { reservationId },
            data: { amountPaid: newPaid, paymentStatus: status, paidAt: status === 'PAID' ? new Date() : null },
        });
    });
    await logActivity({ action: 'INVOICE_PAYMENT_RECORDED', entityType: 'INVOICE', entityId: invoice.id, performedById: req.user.id, metadata: { reservationId, amount: String(amount), paymentStatus: invoice.paymentStatus } });
    res.json(invoice);
}));
