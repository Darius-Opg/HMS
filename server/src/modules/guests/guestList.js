import { decrypt } from "../security/index.js";
import prisma from "../database/index.js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export async function listGuests(req, res, { includePrivateDetails = true } = {}) {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
        Math.max(Number.parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
        MAX_LIMIT,
    );

    const [guests, total] = await Promise.all([
        prisma.guest.findMany({
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                ...(includePrivateDetails && {
                    idNumberEncrypted: true,
                    phoneEncrypted: true,
                    email: true,
                }),
                reservations: {
                    orderBy: [{ checkInDate: "desc" }, { id: "desc" }],
                    select: {
                        id: true,
                        checkInDate: true,
                        checkOutDate: true,
                        actualCheckIn: true,
                        actualCheckOut: true,
                        status: true,
                        room: {
                            select: {
                                roomNumber: true,
                                status: true,
                                roomType: {
                                    select: {
                                        name: true,
                                        basePrice: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),
        prisma.guest.count(),
    ]);

    res.set("X-Total-Count", String(total));
    res.set("X-Page", String(page));
    res.set("X-Limit", String(limit));
    res.set("Access-Control-Expose-Headers", "X-Total-Count, X-Page, X-Limit");
    res.json(guests.map((guest) => {
        const latestReservation = guest.reservations.find(
            (reservation) => reservation.status !== "CANCELLED",
        );
        const currentReservation = guest.reservations.find(
            (reservation) => reservation.status === "BOOKED" || reservation.status === "CHECKED_IN",
        );
        const latestCheckIn = guest.reservations.find(
            (reservation) => reservation.status === "CHECKED_IN" || reservation.status === "CHECKED_OUT",
        );
        const latestCheckOut = guest.reservations.find(
            (reservation) => reservation.status === "CHECKED_OUT",
        );
        const roomReservation = currentReservation ?? latestReservation;
        const { reservations, phoneEncrypted, idNumberEncrypted, ...guestDetails } = guest;

        return {
            ...guestDetails,
            name: [guest.firstName, guest.lastName].filter(Boolean).join(" "),
            ...(includePrivateDetails && {
                phone: decrypt(phoneEncrypted),
                idNumber: decrypt(idNumberEncrypted),
            }),
            hasReservations: reservations.length > 0,
            reservationCount: reservations.length,
            currentReservationStatus: currentReservation?.status
                ?? latestReservation?.status
                ?? "NO_RESERVATIONS",
            currentReservation: currentReservation ? {
                id: currentReservation.id,
                status: currentReservation.status,
                checkInDate: currentReservation.checkInDate,
                checkOutDate: currentReservation.checkOutDate,
                room: currentReservation.room,
            } : null,
            room: roomReservation?.room ?? null,
            roomStatus: roomReservation?.room.status ?? "NO ROOM",
            lastCheckIn: latestCheckIn
                ? (latestCheckIn.actualCheckIn ?? latestCheckIn.checkInDate)
                : null,
            lastCheckOut: latestCheckOut
                ? (latestCheckOut.actualCheckOut ?? latestCheckOut.checkOutDate)
                : null,
        };
    }));
}

export async function listFrontDeskGuests(req, res) {
    return listGuests(req, res, { includePrivateDetails: false });
}
