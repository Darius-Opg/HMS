
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


