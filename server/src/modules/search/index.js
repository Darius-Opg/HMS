import express from 'express';
import prisma from '../database/index.js';
import { requireAuth } from '../auth/access.js';
import { handle } from '../rooms/index.js';
import { decrypt } from '../security/index.js';

const RESULT_LIMIT = 5;
const MAX_QUERY_LENGTH = 100;

export const router = express.Router();

router.use(requireAuth);

router.get('/', handle(async (req, res) => {
    const query = req.query.q;
    if (typeof query !== 'string') {
        return res.status(400).json({ error: 'q must be a search string' });
    }

    const term = query.trim();
    if (term.length > MAX_QUERY_LENGTH) {
        return res.status(400).json({ error: `q must be no more than ${MAX_QUERY_LENGTH} characters` });
    }
    if (term.length < 2) return res.json([]);

    const contains = { contains: term, mode: 'insensitive' };
    const permissions = req.user.permissions ?? [];
    const searches = [];

    if (permissions.includes('MANAGE_ROOMS') || permissions.includes('MANAGE_RESERVATIONS')) {
        searches.push(
            prisma.room.findMany({
                where: {
                    OR: [
                        { roomNumber: contains },
                        { roomType: { name: contains } },
                    ],
                },
                select: {
                    id: true,
                    roomNumber: true,
                    status: true,
                    floor: true,
                    roomColor: true,
                    features: true,
                    roomType: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            basePrice: true,
                            capacity: true,
                            features: true,
                        },
                    },
                },
                orderBy: { roomNumber: 'asc' },
                take: RESULT_LIMIT,
            }).then((rooms) => rooms.map((room) => ({
                type: 'room',
                id: room.id,
                title: `Room ${room.roomNumber}`,
                subtitle: `${room.roomType.name} · ${room.status}`,
                room,
            }))),
        );
    }

    if (permissions.includes('MANAGE_GUESTS')) {
        const canViewPrivateDetails = req.user.role === 'ADMIN';
        searches.push(
            prisma.guest.findMany({
                where: {
                    isDelete: false,
                    OR: [
                        { firstName: contains },
                        { lastName: contains },
                        ...(canViewPrivateDetails ? [{ email: contains }] : []),
                    ],
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    loyaltyTier: true,
                    ...(canViewPrivateDetails && {
                        email: true,
                        phoneEncrypted: true,
                        idNumberEncrypted: true,
                    }),
                    reservations: {
                        orderBy: [{ checkInDate: 'desc' }, { id: 'desc' }],
                        take: 10,
                        select: {
                            id: true,
                            status: true,
                            checkInDate: true,
                            checkOutDate: true,
                            actualCheckIn: true,
                            actualCheckOut: true,
                            room: {
                                select: {
                                    roomNumber: true,
                                    status: true,
                                    roomType: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
                orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
                take: RESULT_LIMIT,
            }).then((guests) => guests.map((guest) => {
                const {
                    phoneEncrypted,
                    idNumberEncrypted,
                    reservations,
                    ...details
                } = guest;
                const currentReservation = reservations.find(
                    (reservation) => reservation.status === 'BOOKED' || reservation.status === 'CHECKED_IN',
                ) ?? reservations.find((reservation) => reservation.status !== 'CANCELLED');
                const latestCheckIn = reservations.find(
                    (reservation) => reservation.status === 'CHECKED_IN' || reservation.status === 'CHECKED_OUT',
                );
                const latestCheckOut = reservations.find(
                    (reservation) => reservation.status === 'CHECKED_OUT',
                );
                const guestDetails = {
                    ...details,
                    currentReservation: currentReservation ?? null,
                    room: currentReservation?.room ?? null,
                    lastCheckIn: latestCheckIn
                        ? latestCheckIn.actualCheckIn ?? latestCheckIn.checkInDate
                        : null,
                    lastCheckOut: latestCheckOut
                        ? latestCheckOut.actualCheckOut ?? latestCheckOut.checkOutDate
                        : null,
                    ...(phoneEncrypted && { phone: decrypt(phoneEncrypted) }),
                    ...(idNumberEncrypted && { idNumber: decrypt(idNumberEncrypted) }),
                };
                return {
                    type: 'guest',
                    id: guest.id,
                    title: `${guest.firstName} ${guest.lastName}`.trim(),
                    subtitle: 'Guest',
                    guest: guestDetails,
                };
            })),
        );
    }

    if (permissions.includes('MANAGE_RESERVATIONS')) {
        searches.push(
            prisma.reservation.findMany({
                where: {
                    OR: [
                        { guest: { firstName: contains } },
                        { guest: { lastName: contains } },
                        { room: { roomNumber: contains } },
                    ],
                },
                select: {
                    id: true,
                    status: true,
                    checkInDate: true,
                    checkOutDate: true,
                    actualCheckIn: true,
                    actualCheckOut: true,
                    rateAtBooking: true,
                    guest: { select: { id: true, firstName: true, lastName: true } },
                    room: {
                        select: {
                            roomNumber: true,
                            status: true,
                            roomType: { select: { name: true } },
                        },
                    },
                    invoice: {
                        select: {
                            totalAmount: true,
                            amountPaid: true,
                            extraCharges: true,
                            paymentStatus: true,
                        },
                    },
                },
                orderBy: [{ checkInDate: 'desc' }, { id: 'desc' }],
                take: RESULT_LIMIT,
            }).then((reservations) => reservations.map((reservation) => ({
                type: 'reservation',
                id: reservation.id,
                title: `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim(),
                subtitle: `Room ${reservation.room.roomNumber} · ${reservation.status} · ${reservation.checkInDate.toISOString().slice(0, 10)}`,
                reservation,
            }))),
        );
    }

    const results = (await Promise.all(searches)).flat();
    return res.json(results);
}));
