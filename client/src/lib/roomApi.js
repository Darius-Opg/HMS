
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
    firstName, lastName, phoneNumber,
    idNumber, email, checkInDate,
    period, periodUnit, paidAmount, }) {
    const response = await send(`/guests/reserve`, {
        method: 'POST',
        body: JSON.stringify({
            roomNumber,
            firstName, lastName, phoneNumber,
            idNumber, email, checkInDate,
            period, periodUnit, paidAmount,
        }),
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Failed to reserve room");
    }
    return data;
}

