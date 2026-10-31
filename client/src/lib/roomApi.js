
import { apiFetch, send } from './api.js';

export async function listRoomTypes() {
    const res = await send('/rooms/types');
    if (!res.ok) throw new Error(`Failed to list available room types`);
    return res.json();
}

export async function getRoomTypeById(id) {
    const res = await send(`/rooms/types/${id}`);
    if (!res.ok) throw new Error(`Failed to get room type ${id}`);
    return res.json();
}

export async function listRooms({ roomTypeId } = {}) {
    const query = roomTypeId ? `?${new URLSearchParams({ roomTypeId })}` : '';
    const res = await apiFetch(`/rooms${query}`);
    if (!res.ok) throw new Error('Failed to list rooms');
    return res.json();
}

export async function reserveRoom({ roomNumber,
    guestId,
    firstName, lastName, phoneNumber,
    idNumber, email, checkInDate,
    period, periodUnit, paidAmount, roomStatus = 'RESERVED', }) {
    const response = await apiFetch(`/guests/reserve`, {
        method: 'POST',
        body: JSON.stringify({
            roomNumber,
            guestId,
            firstName, lastName, phoneNumber,
            idNumber, email, checkInDate,
            period, periodUnit, paidAmount, roomStatus,
        }),
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Failed to reserve room");
    }
    return data;
}

async function readGuestActionResponse(response, fallbackMessage) {
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || fallbackMessage);
    return data;
}

export async function findGuestByIdNumber(idNumber) {
    const query = new URLSearchParams({ idNumber });
    const response = await apiFetch(`/guests/lookup?${query}`);
    return readGuestActionResponse(response, "Could not look up guest.");
}

export async function checkRoomNumberAvailability({ roomNumber, checkInDate, period, periodUnit }) {
    const query = new URLSearchParams({ roomNumber, checkInDate, period: String(period), periodUnit });
    const response = await apiFetch(`/guests/room-availability?${query}`);
    return readGuestActionResponse(response, "Could not check room availability.");
}
