import express from 'express';
import prisma from '../database/index.js';
import { requireAuth, requirePermission } from '../auth/access.js';
import { handle } from '../rooms/index.js';


export const router = express.Router();

router.use(requireAuth, requirePermission('MANAGE_RESERVATIONS'));

router.get('/', handle(async (req, res) => {
    const reservations = await prisma.reservation.findMany({
        orderBy: { checkInDate: 'desc' },
        include: {
            guest: {
                select: {
                    firstName: true,
                    lastName: true,
                },
            },
            room: {
                select: {
                    roomNumber: true,
                    roomType: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
            invoice: {
                select: {
                    totalAmount: true,
                    amountPaid: true,
                    paymentStatus: true,
                },
            },
        },
    });

    const now = Date.now();
    res.json(reservations.map((reservation) => {
        const checkOutTime = new Date(reservation.checkOutDate).getTime();
        const isActive = reservation.status === 'BOOKED' || reservation.status === 'CHECKED_IN';
        const extraTimeStayedMinutes = isActive && checkOutTime < now
            ? Math.floor((now - checkOutTime) / 60_000)
            : 0;
        const extraTimeCharge = extraTimeStayedMinutes > 60
            ? Math.round((Number(reservation.rateAtBooking) * extraTimeStayedMinutes / 60) * 100) / 100
            : 0;
        const invoiceTotal = Number(reservation.invoice?.totalAmount ?? 0);
        const amountPaid = Number(reservation.invoice?.amountPaid ?? 0);
        const balance = Math.max(invoiceTotal - amountPaid, 0) + extraTimeCharge;

        return { ...reservation, extraTimeStayedMinutes, extraTimeCharge, balance };
    }));
}));
