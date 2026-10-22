import { apiFetch } from "./api.js";

async function readResponse(response, fallbackMessage) {
    const data = response.status === 204
        ? null
        : await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || data?.message || fallbackMessage);
    }
    return data;
}

export async function listHousekeepingRooms() {
    const response = await apiFetch("/rooms");
    const rooms = await readResponse(response, "Could not load rooms.");
    if (!Array.isArray(rooms)) {
        throw new Error("The rooms response was not a list.");
    }
    return rooms;
}

export async function listHousekeepingRoomTypes() {
    const response = await apiFetch("/rooms/types");
    const roomTypes = await readResponse(response, "Could not load room types.");
    if (!Array.isArray(roomTypes)) {
        throw new Error("The room types response was not a list.");
    }
    return roomTypes;
}

export async function createHousekeepingRoom(room) {
    const response = await apiFetch("/rooms", {
        method: "POST",
        body: JSON.stringify(room),
    });
    return readResponse(response, "Could not create room.");
}

export async function updateHousekeepingRoom(roomId, updates) {
    const response = await apiFetch(`/rooms/${encodeURIComponent(roomId)}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
    });
    return readResponse(response, "Could not update room.");
}

export async function deleteHousekeepingRoom(roomId) {
    const response = await apiFetch(`/rooms/${encodeURIComponent(roomId)}`, {
        method: "DELETE",
    });
    await readResponse(response, "Could not delete room.");
}

export async function setHousekeepingRoomStatus(roomId, status) {
    const response = await apiFetch(`/rooms/${encodeURIComponent(roomId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });
    return readResponse(response, "Could not update room status.");
}

export async function createHousekeepingRoomType(roomType) {
    const response = await apiFetch("/rooms/types", {
        method: "POST",
        body: JSON.stringify(roomType),
    });
    return readResponse(response, "Could not create room type.");
}