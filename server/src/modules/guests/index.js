import express from 'express';
import { requireAuth, requirePermission } from '../auth/access.js';
import { handle } from '../rooms/index.js';
import { httpError, withLogging } from '../rooms/roomHelper.js';
import { encrypt, hash } from '../security/index.js';
import { calculateStayDate, calculateTotalFees } from './rateCalculation.js';
import prisma from '../database/index.js';

export const reserveRoom = withLogging('reserveRoom', async (req, res) => {
    const {
        roomNumber,
        firstName,
        lastName,
        phoneNumber,
        idNumber,
        email,
        checkInDate,
        period,
        periodUnit,
        paidAmount,
    } = req.body ?? {};

    if (
        typeof roomNumber !== 'string' || !roomNumber.trim()
        || typeof firstName !== 'string' || !firstName.trim()
        || typeof lastName !== 'string' || !lastName.trim()
        || typeof phoneNumber !== 'string' || !phoneNumber.trim()
        || typeof idNumber !== 'string' || !idNumber.trim()
        || !checkInDate
        || period === undefined || period === null || period === ''
        || !periodUnit
    ) {
        throw httpError(400, 'roomNumber, firstName, lastName, phoneNumber, idNumber, checkInDate, period, and periodUnit are required');
    }
    if (email !== undefined && email !== null && typeof email !== 'string') {
        throw httpError(400, 'email must be text');
    }

    const checkIn = new Date(checkInDate);
    const checkOut = calculateStayDate(period, periodUnit, checkIn);
    if (!checkOut || Number.isNaN(checkIn.getTime()) || checkOut <= checkIn) {
        throw httpError(400, 'checkInDate, period, or periodUnit is invalid');
    }

    const idNumberHash = hash(idNumber.trim());
    const phoneNumberHash = hash(phoneNumber.trim());
    const normalizedEmail = email?.trim() || null;
    const normalizedRoomNumber = roomNumber.trim();

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

        const existingGuest = await transaction.guest.findUnique({
            where: { idNumberHash },
            select: { id: true },
        });
        const guest = existingGuest ?? await transaction.guest.create({
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

        const roomUpdate = await transaction.room.updateMany({
            where: { id: room.id, status: 'AVAILABLE' },
            data: { status: 'OCCUPIED' },
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

    res.status(201).json(reservation);
});

export const router = express.Router();
router.use(requireAuth, requirePermission('MANAGE_GUESTS'));
router.post('/reserve', handle(reserveRoom));
