import express from 'express';
import prisma from '../database/index.js';
import { ReservationStatus } from '../../generated/prisma/index.js';
import { requireAuth, requirePermission } from '../auth/access.js';
import { handle } from '../rooms/index.js';
import { assertUuid, httpError, parseDate } from '../rooms/roomHelper.js';


export const router = express.Router();

router.use(requireAuth, requirePermission('MANAGE_RESERVATIONS'));

router.patch('/checkin', handle(async (req, res) => {
    const { reservationId } = req.body ?? {};
    assertUuid(reservationId, 'reservationId');

    const checkedIn = await prisma.$transaction(async (transaction) => {
        const reservation = await transaction.reservation.findUnique({
            where: { id: reservationId },
            select: {
                id: true,
                roomId: true,
                status: true,
                checkInDate: true,
                checkOutDate: true,
            },
        });
        if (!reservation) throw httpError(404, 'Reservation not found');
        if (reservation.status !== ReservationStatus.BOOKED) {
            throw httpError(409, 'Only booked reservations can be checked in');
        }

        const actualCheckIn = new Date();
        const scheduledStayDuration = reservation.checkOutDate.getTime() - reservation.checkInDate.getTime();
        const reservationUpdate = await transaction.reservation.updateMany({
            where: { id: reservationId, status: ReservationStatus.BOOKED },
            data: {
                status: ReservationStatus.CHECKED_IN,
                actualCheckIn,
                ...(actualCheckIn < reservation.checkInDate && {
                    checkOutDate: new Date(actualCheckIn.getTime() + scheduledStayDuration),
                }),
            },
        });
        if (reservationUpdate.count !== 1) {
            throw httpError(409, 'Reservation is no longer available for check-in');
        }

        const roomUpdate = await transaction.room.updateMany({
            where: {
                id: reservation.roomId,
                status: { in: ['OCCUPIED', 'RESERVED'] },
            },
            data: { status: 'OCCUPIED' },
        });
        if (roomUpdate.count !== 1) {
            throw httpError(409, 'Room is no longer available for check-in');
        }

        return transaction.reservation.findUnique({
            where: { id: reservationId },
            include: {
                guest: { select: { firstName: true, lastName: true } },
                room: {
                    select: {
                        roomNumber: true,
                        roomType: { select: { name: true } },
                    },
                },
                invoice: {
                    select: { totalAmount: true, amountPaid: true, paymentStatus: true },
                },
            },
        });
    });

    res.json(checkedIn);
}));

function calculateExtraTimeCharge(checkOutDate, rateAtBooking, isActive) {
    const checkOutTime = new Date(checkOutDate).getTime();
    const extraTimeStayedMinutes = isActive && checkOutTime < Date.now()
        ? Math.floor((Date.now() - checkOutTime) / 60_000)
        : 0;

    return extraTimeStayedMinutes > 60
        ? Math.round((Number(rateAtBooking) * extraTimeStayedMinutes / 60) * 100) / 100
        : 0;
}

router.patch('/update', handle(async (req, res) => {
    const { reservationId, checkOutTime, paymentType, paidAmount } = req.body ?? {};
    assertUuid(reservationId, 'reservationId');
    const checkOutDate = parseDate(checkOutTime, 'checkOutTime');

    if (paymentType !== 'FULL' && paymentType !== 'PARTIAL') {
        throw httpError(400, 'paymentType must be FULL or PARTIAL');
    }
    if (paymentType === 'PARTIAL') {
        if (typeof paidAmount !== 'number' || !Number.isFinite(paidAmount) || paidAmount <= 0) {
            throw httpError(400, 'paidAmount must be greater than 0 for a partial payment');
        }
    }

    const updated = await prisma.$transaction(async (transaction) => {
        const reservation = await transaction.reservation.findUnique({
            where: { id: reservationId },
            include: { invoice: true },
        });
        if (!reservation) throw httpError(404, 'Reservation not found');
        if (reservation.status !== 'BOOKED' && reservation.status !== 'CHECKED_IN') {
            throw httpError(409, 'Only active reservations can be updated');
        }
        if (checkOutDate <= reservation.checkInDate) {
            throw httpError(400, 'checkOutTime must be after check-in');
        }
        if (!reservation.invoice) throw httpError(409, 'Reservation has no invoice');

        const durationHours = (checkOutDate.getTime() - reservation.checkInDate.getTime()) / 3_600_000;
        const totalAmount = Math.round(Number(reservation.rateAtBooking) * durationHours * 100) / 100;
        const currentAmountPaid = Number(reservation.invoice.amountPaid);
        const isActive = reservation.status === 'BOOKED' || reservation.status === 'CHECKED_IN';
        const extraTimeCharge = calculateExtraTimeCharge(checkOutDate, reservation.rateAtBooking, isActive);
        const totalDue = Math.round((totalAmount + extraTimeCharge) * 100) / 100;
        if (totalDue < currentAmountPaid) {
            throw httpError(409, 'The updated stay total cannot be less than the amount already paid');
        }

        const outstandingBalance = Math.round((totalDue - currentAmountPaid) * 100) / 100;
        if (paymentType === 'PARTIAL' && paidAmount > outstandingBalance) {
            throw httpError(400, 'Payment cannot exceed the outstanding balance');
        }

        const amountPaid = paymentType === 'PARTIAL'
            ? Math.round((currentAmountPaid + paidAmount) * 100) / 100
            : totalDue;
        const paymentStatus = amountPaid >= totalDue
            ? 'PAID'
            : amountPaid > 0 ? 'PARTIAL' : 'PENDING';

        await transaction.reservation.update({
            where: { id: reservationId },
            data: { checkOutDate },
        });
        await transaction.invoice.update({
            where: { reservationId },
            data: {
                totalAmount,
                amountPaid,
                paymentStatus,
                paidAt: paymentStatus === 'PAID' ? (reservation.invoice.paidAt ?? new Date()) : null,
            },
        });

        return transaction.reservation.findUnique({
            where: { id: reservationId },
            include: { invoice: true },
        });
    });

    res.json(updated);
}));

router.patch('/checkout', handle(async (req, res) => {
    const { reservationId } = req.body ?? {};
    assertUuid(reservationId, 'reservationId');

    const checkedOut = await prisma.$transaction(async (transaction) => {
        const reservation = await transaction.reservation.findUnique({
            where: { id: reservationId },
            select: {
                id: true,
                roomId: true,
                status: true,
                checkOutDate: true,
                rateAtBooking: true,
                invoice: true,
            },
        });
        if (!reservation) throw httpError(404, 'Reservation not found');
        if (reservation.status !== 'BOOKED' && reservation.status !== 'CHECKED_IN') {
            throw httpError(409, 'Only active reservations can be checked out');
        }

        if (!reservation.invoice) throw httpError(409, 'Reservation has no invoice');

        const extraTimeCharge = calculateExtraTimeCharge(
            reservation.checkOutDate,
            reservation.rateAtBooking,
            true,
        );
        const invoiceTotal = Number(reservation.invoice.totalAmount);
        const amountPaid = Number(reservation.invoice.amountPaid);
        const totalDue = Math.round((invoiceTotal + extraTimeCharge) * 100) / 100;
        const balance = Math.max(Math.round((totalDue - amountPaid) * 100) / 100, 0);
        if (balance > 0) {
            throw httpError(409, `Cannot check out with an outstanding balance of ${balance.toFixed(2)}`);
        }

        const updateResult = await transaction.reservation.updateMany({
            where: {
                id: reservationId,
                status: { in: ['BOOKED', 'CHECKED_IN'] },
            },
            data: {
                status: 'CHECKED_OUT',
                actualCheckOut: new Date(),
            },
        });
        if (updateResult.count !== 1) {
            throw httpError(409, 'Reservation is no longer active');
        }

        const roomUpdate = await transaction.room.updateMany({
            where: { id: reservation.roomId, status: { in: ['OCCUPIED', 'RESERVED'] } },
            data: { status: 'AVAILABLE' },
        });
        if (roomUpdate.count !== 1) {
            throw httpError(409, 'Room is no longer occupied by this reservation');
        }

        if (extraTimeCharge > 0) {
            await transaction.invoice.update({
                where: { reservationId },
                data: {
                    totalAmount: totalDue,
                    extraCharges: Number(reservation.invoice.extraCharges) + extraTimeCharge,
                    paymentStatus: 'PAID',
                    paidAt: reservation.invoice.paidAt ?? new Date(),
                },
            });
        }

        return transaction.reservation.findUnique({
            where: { id: reservationId },
            include: {
                room: { select: { roomNumber: true, status: true } },
                invoice: true,
            },
        });
    });

    res.json(checkedOut);
}));

router.patch('/cancel', handle(async (req, res) => {
    const { reservationId } = req.body ?? {};
    assertUuid(reservationId, 'reservationId');

    const cancelled = await prisma.$transaction(async (transaction) => {
        const reservation = await transaction.reservation.findUnique({
            where: { id: reservationId },
            select: {
                id: true,
                roomId: true,
                status: true,
                room: { select: { status: true } },
            },
        });
        if (!reservation) throw httpError(404, 'Reservation not found');
        if (reservation.status !== ReservationStatus.BOOKED) {
            throw httpError(409, 'Only booked reservations can be cancelled');
        }
        if (reservation.room.status !== 'RESERVED') {
            throw httpError(409, 'Only reservations for reserved rooms can be cancelled');
        }

        const reservationUpdate = await transaction.reservation.updateMany({
            where: { id: reservationId, status: ReservationStatus.BOOKED },
            data: { status: ReservationStatus.CANCELLED },
        });
        if (reservationUpdate.count !== 1) {
            throw httpError(409, 'Reservation is no longer available for cancellation');
        }

        const roomUpdate = await transaction.room.updateMany({
            where: { id: reservation.roomId, status: 'RESERVED' },
            data: { status: 'AVAILABLE' },
        });
        if (roomUpdate.count !== 1) {
            throw httpError(409, 'Room is no longer available for cancellation');
        }

        return transaction.reservation.findUnique({
            where: { id: reservationId },
            include: {
                room: { select: { roomNumber: true, status: true } },
            },
        });
    });

    res.json(cancelled);
}));


const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

router.get('/', handle(async (req, res) => {
    const { status } = req.query;
    const activeStatuses = [ReservationStatus.BOOKED, ReservationStatus.CHECKED_IN];

    let statusFilter = activeStatuses;
    if (status) {
        const statuses = String(status)
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean);

        const valid = Object.values(ReservationStatus);
        const invalid = statuses.filter((s) => !valid.includes(s));
        if (invalid.length) {
            return res.status(400).json({
                message: `Invalid status: ${invalid.join(', ')}. Allowed: ${valid.join(', ')}`,
            });
        }
        statusFilter = statuses.filter((reservationStatus) => activeStatuses.includes(reservationStatus));
    }

    const where = {
        status: { in: statusFilter },
        room: { is: { status: { in: ['OCCUPIED', 'RESERVED'] } } },
    };

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const [reservations, total] = await Promise.all([
        prisma.reservation.findMany({
            where,
            orderBy: [{ checkInDate: 'desc' }, { id: 'desc' }], 
            skip: (page - 1) * limit,
            take: limit,
            include: {
                guest: { select: { firstName: true, lastName: true } },
                room: {
                    select: {
                        roomNumber: true,
                        status: true,
                        roomType: { select: { name: true } },
                    },
                },
                invoice: {
                    select: { totalAmount: true, amountPaid: true, paymentStatus: true },
                },
            },
        }),
        prisma.reservation.count({ where }),
    ]);

    const now = Date.now();
    const result = reservations.map((reservation) => {
        const checkOutTime = new Date(reservation.checkOutDate).getTime();
        const isActive = reservation.status === 'BOOKED' || reservation.status === 'CHECKED_IN';
        const extraTimeStayedMinutes = isActive && checkOutTime < now
            ? Math.floor((now - checkOutTime) / 60_000)
            : 0;
        const extraTimeCharge = calculateExtraTimeCharge(
            reservation.checkOutDate,
            reservation.rateAtBooking,
            isActive,
        );
        const invoiceTotal = Number(reservation.invoice?.totalAmount ?? 0);
        const amountPaid = Number(reservation.invoice?.amountPaid ?? 0);
        const balance = Math.max(invoiceTotal + extraTimeCharge - amountPaid, 0);

        return { ...reservation, extraTimeStayedMinutes, extraTimeCharge, balance };
    });

    res.set('X-Total-Count', String(total));
    res.json(result); 
}));
