import express from 'express';
import prisma from '../database/index.js';
import { ReservationStatus } from '../../generated/prisma/index.js';
import { requireAuth, requirePermission } from '../auth/access.js';
import { handle } from '../rooms/index.js';
import { assertUuid, httpError, parseDate, reservationOverlapWhere } from '../rooms/roomHelper.js';
import { logActivity } from '../audit/logActivity.js';
import { Prisma } from '../../generated/prisma/index.js';
import { calculateExtraTimeCharge, calculateTotalFeesForStay } from '../guests/rateCalculation.js';


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

    await logActivity({
        action: 'GUEST_CHECKED_IN',
        entityType: 'GUEST',
        entityId: checkedIn.guestId,
        performedById: req.user.id,
        metadata: { reservationId, roomNumber: checkedIn.room?.roomNumber },
    });
    res.json(checkedIn);
}));

router.patch('/modify', handle(async (req, res) => {
    const { reservationId, roomId } = req.body ?? {};
    assertUuid(reservationId, 'reservationId');
    if (roomId !== undefined) assertUuid(roomId, 'roomId');
    const checkInDate = req.body?.checkInDate === undefined ? undefined : parseDate(req.body.checkInDate, 'checkInDate');
    const checkOutDate = req.body?.checkOutDate === undefined ? undefined : parseDate(req.body.checkOutDate, 'checkOutDate');

    const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.reservation.findUnique({ where: { id: reservationId }, include: { invoice: true } });
        if (!current) throw httpError(404, 'Reservation not found');
        if (current.status !== ReservationStatus.BOOKED) throw httpError(409, 'Only booked reservations can be modified');
        const nextRoomId = roomId ?? current.roomId;
        const nextCheckIn = checkInDate ?? current.checkInDate;
        const nextCheckOut = checkOutDate ?? current.checkOutDate;
        if (nextCheckOut <= nextCheckIn) throw httpError(400, 'checkOutDate must be after checkInDate');

        const targetRoom = await tx.room.findUnique({ where: { id: nextRoomId }, select: { id: true, status: true } });
        if (!targetRoom) throw httpError(404, 'Room not found');
        if (nextRoomId !== current.roomId && targetRoom.status === 'MAINTENANCE') throw httpError(409, 'Room is under maintenance');
        const overlap = await tx.reservation.findFirst({
            where: {
                roomId: nextRoomId,
                ...reservationOverlapWhere(nextCheckIn, nextCheckOut, reservationId),
            }, select: { id: true },
        });
        if (overlap) throw httpError(409, 'Room is already reserved for the selected period');

        const base = calculateTotalFeesForStay(current.rateAtBooking, nextCheckIn, nextCheckOut);
        if (base === null) throw httpError(400, 'Reservation rate or dates are invalid');
        const extras = new Prisma.Decimal(current.invoice?.extraCharges ?? 0);
        const total = base.plus(extras).toDecimalPlaces(2);
        const amountPaid = new Prisma.Decimal(current.invoice?.amountPaid ?? 0);
        if (amountPaid.gt(total)) throw httpError(409, 'The updated stay total cannot be less than the amount already paid');

        if (nextRoomId !== current.roomId) {
            if (targetRoom.status === 'AVAILABLE') {
                const claimed = await tx.room.updateMany({ where: { id: nextRoomId, status: 'AVAILABLE' }, data: { status: 'RESERVED' } });
                if (claimed.count !== 1) throw httpError(409, 'Room is no longer available');
            }
        }
        await tx.reservation.update({ where: { id: reservationId }, data: { roomId: nextRoomId, checkInDate: nextCheckIn, checkOutDate: nextCheckOut } });
        if (nextRoomId !== current.roomId) {
            const [remainingBookings, checkedInGuests] = await Promise.all([
                tx.reservation.count({ where: { roomId: current.roomId, status: 'BOOKED' } }),
                tx.reservation.count({ where: { roomId: current.roomId, status: 'CHECKED_IN' } }),
            ]);
            await tx.room.updateMany({
                where: { id: current.roomId, status: 'RESERVED' },
                data: { status: checkedInGuests ? 'OCCUPIED' : remainingBookings ? 'RESERVED' : 'AVAILABLE' },
            });
        }
        if (current.invoice) {
            const status = amountPaid.gte(total) ? 'PAID' : amountPaid.gt(0) ? 'PARTIAL' : 'PENDING';
            await tx.invoice.update({ where: { reservationId }, data: { totalAmount: total, paymentStatus: status, paidAt: status === 'PAID' ? current.invoice.paidAt ?? new Date() : null } });
        }
        return tx.reservation.findUnique({ where: { id: reservationId }, include: { room: true, invoice: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await logActivity({ action: 'RESERVATION_MODIFIED', entityType: 'GUEST', entityId: updated.guestId, performedById: req.user.id, metadata: { reservationId, roomId: updated.roomId } });
    res.json(updated);
}));

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

        const totalAmount = calculateTotalFeesForStay(reservation.rateAtBooking, reservation.checkInDate, checkOutDate);
        if (totalAmount === null) throw httpError(400, 'Reservation rate or dates are invalid');
        const currentAmountPaid = new Prisma.Decimal(reservation.invoice.amountPaid);
        const extraTimeCharge = new Prisma.Decimal(0);
        const totalDue = totalAmount.plus(extraTimeCharge).plus(reservation.invoice.extraCharges).toDecimalPlaces(2);
        if (totalDue.lt(currentAmountPaid)) {
            throw httpError(409, 'The updated stay total cannot be less than the amount already paid');
        }

        const outstandingBalance = totalDue.minus(currentAmountPaid).toDecimalPlaces(2);
        let requestedPayment = new Prisma.Decimal(0);
        if (paymentType === 'PARTIAL') {
            try { requestedPayment = new Prisma.Decimal(String(paidAmount)); }
            catch { throw httpError(400, 'paidAmount must be a valid decimal'); }
            if (!requestedPayment.isFinite() || requestedPayment.lte(0)) throw httpError(400, 'paidAmount must be greater than 0 for a partial payment');
        }
        if (paymentType === 'PARTIAL' && requestedPayment.gt(outstandingBalance)) {
            throw httpError(400, 'Payment cannot exceed the outstanding balance');
        }

        const amountPaid = paymentType === 'PARTIAL'
            ? currentAmountPaid.plus(requestedPayment).toDecimalPlaces(2)
            : totalDue;
        const paymentStatus = amountPaid.gte(totalDue)
            ? 'PAID'
            : amountPaid.gt(0) ? 'PARTIAL' : 'PENDING';

        await transaction.reservation.update({
            where: { id: reservationId },
            data: { checkOutDate },
        });
        await transaction.invoice.update({
            where: { reservationId },
            data: {
                totalAmount: totalDue,
                amountPaid,
                paymentStatus,
                paidAt: paymentStatus === 'PAID' ? (reservation.invoice.paidAt ?? new Date()) : null,
                extraCharges: new Prisma.Decimal(reservation.invoice.extraCharges).plus(extraTimeCharge).toDecimalPlaces(2),
            },
        });

        return transaction.reservation.findUnique({
            where: { id: reservationId },
            include: { invoice: true },
        });
    });

    await logActivity({
        action: 'RESERVATION_UPDATED',
        entityType: 'GUEST',
        entityId: updated.guestId,
        performedById: req.user.id,
        metadata: {
            reservationId,
            checkOutDate: updated.checkOutDate.toISOString(),
            amountPaid: Number(updated.invoice.amountPaid),
            totalAmount: Number(updated.invoice.totalAmount),
            paymentStatus: updated.invoice.paymentStatus,
        },
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
        if (reservation.status !== ReservationStatus.CHECKED_IN) {
            throw httpError(409, 'Only checked-in reservations can be checked out');
        }

        if (!reservation.invoice) throw httpError(409, 'Reservation has no invoice');

        const extraTimeCharge = calculateExtraTimeCharge(
            reservation.checkOutDate,
            reservation.rateAtBooking,
            true,
        );
        const invoiceTotal = new Prisma.Decimal(reservation.invoice.totalAmount);
        const amountPaid = new Prisma.Decimal(reservation.invoice.amountPaid);
        const totalDue = invoiceTotal.plus(extraTimeCharge).toDecimalPlaces(2);
        const balance = totalDue.minus(amountPaid).toDecimalPlaces(2);
        if (balance.gt(0)) {
            throw httpError(409, `Cannot check out with an outstanding balance of ${balance.toFixed(2)}`);
        }

        const updateResult = await transaction.reservation.updateMany({
            where: {
                id: reservationId,
                status: ReservationStatus.CHECKED_IN,
            },
            data: {
                status: 'CHECKED_OUT',
                actualCheckOut: new Date(),
            },
        });
        if (updateResult.count !== 1) {
            throw httpError(409, 'Reservation is no longer active');
        }

        const remainingBookings = await transaction.reservation.count({
            where: { roomId: reservation.roomId, status: ReservationStatus.BOOKED },
        });
        const roomUpdate = await transaction.room.updateMany({
            where: { id: reservation.roomId, status: { in: ['OCCUPIED', 'RESERVED'] } },
            data: { status: remainingBookings ? 'RESERVED' : 'AVAILABLE' },
        });
        if (roomUpdate.count !== 1) {
            throw httpError(409, 'Room is no longer occupied by this reservation');
        }

        if (extraTimeCharge.gt(0)) {
            await transaction.invoice.update({
                where: { reservationId },
                data: {
                    totalAmount: totalDue,
                    extraCharges: new Prisma.Decimal(reservation.invoice.extraCharges).plus(extraTimeCharge).toDecimalPlaces(2),
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

    await logActivity({
        action: 'GUEST_CHECKED_OUT',
        entityType: 'GUEST',
        entityId: checkedOut.guestId,
        performedById: req.user.id,
        metadata: {
            reservationId,
            roomNumber: checkedOut.room?.roomNumber,
            actualCheckOut: checkedOut.actualCheckOut?.toISOString(),
            paymentStatus: checkedOut.invoice?.paymentStatus,
        },
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

    await logActivity({
        action: 'RESERVATION_CANCELLED',
        entityType: 'GUEST',
        entityId: cancelled.guestId,
        performedById: req.user.id,
        metadata: { reservationId, roomNumber: cancelled.room?.roomNumber },
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
        statusFilter = statuses;
    }

    const where = { status: { in: statusFilter } };
    if (req.query.guestId !== undefined) {
        assertUuid(req.query.guestId, 'guestId');
        where.guestId = req.query.guestId;
    }
    if (req.query.roomId !== undefined) {
        assertUuid(req.query.roomId, 'roomId');
        where.roomId = req.query.roomId;
    }
    if (req.query.from !== undefined || req.query.to !== undefined) {
        const from = req.query.from === undefined ? undefined : parseDate(req.query.from, 'from');
        const to = req.query.to === undefined ? undefined : parseDate(req.query.to, 'to');
        if (from && to && to < from) throw httpError(400, 'to must be on or after from');
        where.checkInDate = { ...(from && { gte: from }), ...(to && { lte: to }) };
    }

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
                    select: { totalAmount: true, amountPaid: true, extraCharges: true, paymentStatus: true },
                },
            },
        }),
        prisma.reservation.count({ where }),
    ]);

    const now = Date.now();
    const result = reservations.map((reservation) => {
        const checkOutTime = new Date(reservation.checkOutDate).getTime();
        const isCheckedIn = reservation.status === ReservationStatus.CHECKED_IN;
        const extraTimeStayedMinutes = isCheckedIn && checkOutTime < now
            ? Math.floor((now - checkOutTime) / 60_000)
            : 0;
        const extraTimeCharge = calculateExtraTimeCharge(
            reservation.checkOutDate,
            reservation.rateAtBooking,
            isCheckedIn,
        );
        const stayTotal = calculateTotalFeesForStay(
            reservation.rateAtBooking,
            reservation.checkInDate,
            reservation.checkOutDate,
        );
        const extraCharges = new Prisma.Decimal(reservation.invoice?.extraCharges ?? 0);
        const amountPaid = new Prisma.Decimal(reservation.invoice?.amountPaid ?? 0);
        const totalDue = stayTotal
            ? stayTotal.plus(extraCharges).plus(extraTimeCharge).toDecimalPlaces(2)
            : new Prisma.Decimal(0);
        const balance = Math.max(Number(totalDue.minus(amountPaid).toDecimalPlaces(2).toString()), 0);

        return { ...reservation, extraTimeStayedMinutes, extraTimeCharge, balance };
    });

    res.set('X-Total-Count', String(total));
    res.json(result); 
}));
