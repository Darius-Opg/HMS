import express from 'express';
import { requireAuth, requirePermission } from '../auth/access.js';
import { handle } from '../rooms/index.js';
import { assertUuid, httpError, parseDate, withLogging } from '../rooms/roomHelper.js';
import { decrypt, encrypt, hash } from '../security/index.js';
import { calculateStayDate, calculateTotalFees } from './rateCalculation.js';
import { listFrontDeskGuests, listGuests } from './guestList.js';
import prisma from '../database/index.js';
import { logActivity } from '../audit/logActivity.js';

export const reserveRoom = withLogging('reserveRoom', async (req, res) => {
    const {
        roomNumber,
        guestId,
        firstName,
        lastName,
        phoneNumber,
        idNumber,
        email,
        checkInDate,
        period,
        periodUnit,
        paidAmount,
        roomStatus = 'RESERVED',
    } = req.body ?? {};

    if (guestId !== undefined) assertUuid(guestId, 'guestId');

    const hasRegisteredGuest = typeof guestId === 'string';
    if (
        typeof roomNumber !== 'string' || !roomNumber.trim()
        || (!hasRegisteredGuest && (
            typeof firstName !== 'string' || !firstName.trim()
            || typeof lastName !== 'string' || !lastName.trim()
            || typeof phoneNumber !== 'string' || !phoneNumber.trim()
            || typeof idNumber !== 'string' || !idNumber.trim()
        ))
        || !checkInDate
        || period === undefined || period === null || period === ''
        || !periodUnit
    ) {
        throw httpError(400, 'roomNumber, checkInDate, period, and periodUnit are required; guestId or guest identity details must also be supplied');
    }
    if (email !== undefined && email !== null && typeof email !== 'string') {
        throw httpError(400, 'email must be text');
    }
    if (roomStatus !== 'OCCUPIED' && roomStatus !== 'RESERVED') {
        throw httpError(400, 'roomStatus must be OCCUPIED or RESERVED');
    }

    const checkIn = new Date(checkInDate);
    const checkOut = calculateStayDate(period, periodUnit, checkIn);
    if (!checkOut || Number.isNaN(checkIn.getTime()) || checkOut <= checkIn) {
        throw httpError(400, 'checkInDate, period, or periodUnit is invalid');
    }

    const idNumberHash = !hasRegisteredGuest ? hash(idNumber.trim()) : null;
    const phoneNumberHash = !hasRegisteredGuest ? hash(phoneNumber.trim()) : null;
    const normalizedEmail = email?.trim() || null;
    const normalizedRoomNumber = roomNumber.trim();

    let createdGuest = false;
    const reservation = await prisma.$transaction(async (transaction) => {
        const room = await transaction.room.findUnique({
            where: { roomNumber: normalizedRoomNumber },
            include: { roomType: true },
        });
        if (!room) throw httpError(404, 'Room not found');
        if (room.status !== 'AVAILABLE') {
            throw httpError(409, 'Room is not available');
        }

        const overlappingReservation = await transaction.reservation.findFirst({
            where: {
                roomId: room.id,
                status: { in: ['BOOKED', 'CHECKED_IN'] },
                checkInDate: { lt: checkOut },
                checkOutDate: { gt: checkIn },
            },
            select: { id: true },
        });
        if (overlappingReservation) {
            throw httpError(409, 'Room is already reserved for the selected period');
        }

        const totalAmount = calculateTotalFees(room.roomType.basePrice, period, periodUnit);
        if (totalAmount === null) {
            throw httpError(400, 'Room rate or reservation period is invalid');
        }

        const hasPaidAmount = paidAmount !== undefined && paidAmount !== null && paidAmount !== '';
        const amountPaid = hasPaidAmount ? Number(paidAmount) : totalAmount;
        if (!Number.isFinite(amountPaid) || amountPaid <= 0 || amountPaid > totalAmount) {
            throw httpError(400, 'paidAmount must be greater than 0 and no more than the total fees');
        }
        const paymentStatus = amountPaid >= totalAmount ? 'PAID' : 'PARTIAL';

        let guest;
        if (hasRegisteredGuest) {
            guest = await transaction.guest.findUnique({
                where: { id: guestId },
                select: { id: true },
            });
            if (!guest) throw httpError(404, 'Guest not found');
        } else {
            const existingGuest = await transaction.guest.findUnique({
                where: { idNumberHash },
                select: { id: true },
            });
            if (existingGuest) {
                guest = existingGuest;
            } else {
                guest = await transaction.guest.create({
                    data: {
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        email: normalizedEmail,
                        phoneEncrypted: encrypt(phoneNumber.trim()),
                        phoneHash: phoneNumberHash,
                        idNumberEncrypted: encrypt(idNumber.trim()),
                        idNumberHash,
                    },
                    select: { id: true },
                });
                createdGuest = true;
            }
        }

        const roomUpdate = await transaction.room.updateMany({
            where: { id: room.id, status: 'AVAILABLE' },
            data: { status: roomStatus },
        });
        if (roomUpdate.count !== 1) {
            throw httpError(409, 'Room is no longer available');
        }

        return transaction.reservation.create({
            data: {
                checkInDate: checkIn,
                checkOutDate: checkOut,
                rateAtBooking: room.roomType.basePrice,
                guestId: guest.id,
                roomId: room.id,
                createdById: req.user.id,
                invoice: {
                    create: {
                        totalAmount,
                        amountPaid,
                        paymentStatus,
                        paidAt: new Date(),
                    },
                },
            },
            include: {
                room: { select: { roomNumber: true, status: true } },
                invoice: true,
            },
        });
    });

    if (createdGuest) {
        await logActivity({
            action: 'GUEST_CREATED',
            entityType: 'GUEST',
            entityId: reservation.guestId,
            performedById: req.user.id,
            metadata: { source: 'reservation' },
        });
    }
    await logActivity({
        action: 'RESERVATION_CREATED',
        entityType: 'GUEST',
        entityId: reservation.guestId,
        performedById: req.user.id,
        metadata: {
            reservationId: reservation.id,
            roomNumber: reservation.room.roomNumber,
            status: reservation.status,
            checkInDate: reservation.checkInDate.toISOString(),
            checkOutDate: reservation.checkOutDate.toISOString(),
            amountPaid: Number(reservation.invoice.amountPaid),
            totalAmount: Number(reservation.invoice.totalAmount),
        },
    });

    res.status(201).json(reservation);
});

export const router = express.Router();
router.use(requireAuth, requirePermission('MANAGE_GUESTS'));

router.get('/lookup', handle(async (req, res) => {
    const idNumber = typeof req.query.idNumber === 'string' ? req.query.idNumber.trim() : '';
    if (!idNumber) throw httpError(400, 'idNumber is required');

    const guest = await prisma.guest.findUnique({
        where: { idNumberHash: hash(idNumber) },
        select: { id: true, firstName: true, lastName: true, email: true, phoneEncrypted: true },
    });
    if (!guest) return res.json(null);

    const { phoneEncrypted, ...guestDetails } = guest;
    res.json({ ...guestDetails, phoneNumber: decrypt(phoneEncrypted) });
}));

router.get('/room-availability', handle(async (req, res) => {
    const roomNumber = typeof req.query.roomNumber === 'string' ? req.query.roomNumber.trim() : '';
    if (!roomNumber) throw httpError(400, 'roomNumber is required');

    const checkIn = parseDate(req.query.checkInDate, 'checkInDate');
    const checkOut = calculateStayDate(req.query.period, req.query.periodUnit, checkIn);
    if (!checkOut || checkOut <= checkIn) {
        throw httpError(400, 'checkInDate, period, or periodUnit is invalid');
    }

    const room = await prisma.room.findUnique({
        where: { roomNumber },
        select: { id: true, roomNumber: true, status: true, roomType: { select: { name: true, basePrice: true } } },
    });
    if (!room) return res.json({ available: false, reason: 'Room not found' });

    const overlappingReservation = await prisma.reservation.findFirst({
        where: {
            roomId: room.id,
            status: { in: ['BOOKED', 'CHECKED_IN'] },
            checkInDate: { lt: checkOut },
            checkOutDate: { gt: checkIn },
        },
        select: { id: true },
    });
    const available = room.status === 'AVAILABLE' && !overlappingReservation;
    res.json({
        available,
        reason: available ? null : room.status === 'MAINTENANCE' ? 'Room is under maintenance' : 'Room is not available for these dates',
        room: { roomNumber: room.roomNumber, roomType: room.roomType },
    });
}));

router.get('/:guestId/history', handle(async (req, res) => {
    const { guestId } = req.params;
    assertUuid(guestId, 'guest id');
    const guest = await prisma.guest.findUnique({ where: { id: guestId }, select: { id: true } });
    if (!guest) throw httpError(404, 'Guest not found');

    const activities = await prisma.auditLog.findMany({
        where: { entityType: 'GUEST', entityId: guestId },
        orderBy: { createdAt: 'desc' },
        include: { performedBy: { select: { id: true, name: true } } },
    });
    res.json(activities);
}));

router.post('/reserve', handle(reserveRoom));
router.get('/', (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
}, handle(listGuests));
router.get('/frontdesk', handle(listFrontDeskGuests));
