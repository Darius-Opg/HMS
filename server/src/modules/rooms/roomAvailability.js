import { assertUuid, httpError, parseDate, reservationOverlapWhere, withLogging } from "./roomHelper.js";
import prisma from "../database/index.js";

export const findAvailableRooms = withLogging(
    'findAvailableRooms',
    async ({ checkInDate, checkOutDate, roomTypeId, capacity } = {}) => {
        const checkIn = parseDate(checkInDate, 'checkIn');
        const checkOut = parseDate(checkOutDate, 'checkOut');
        if (checkOut <= checkIn) throw httpError(400, 'checkOut must be after checkIn');

        if (roomTypeId !== undefined) assertUuid(roomTypeId, 'roomTypeId');
        if (capacity !== undefined && (!Number.isInteger(capacity) || capacity < 1)) {
            throw httpError(400, 'capacity must be a whole number of at least 1');
        }

        return prisma.room.findMany({
            where: {
                status: { not: 'MAINTENANCE' },
                ...(roomTypeId !== undefined && { roomTypeId }),
                ...(capacity !== undefined && { roomType: { capacity: { gte: capacity } } }),
                reservations: {
                    none: {
                        ...reservationOverlapWhere(checkIn, checkOut),
                    },
                },
            },
            include: { roomType: true },
            orderBy: { roomNumber: 'asc' },
        });
    },
);
