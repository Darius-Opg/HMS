import { apiFetch } from "./api.js";

async function readResponse(response, fallbackMessage) {
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || data?.message || fallbackMessage);
    }
    return data;
}

async function listGuests(path, fallbackMessage) {
    const limit = 200;
    const guests = [];
    let page = 1;
    let total = null;
    let hasMore = true;

    while (hasMore) {
        const query = new URLSearchParams({ page: String(page), limit: String(limit) });
        const response = await apiFetch(`${path}?${query}`);
        const pageGuests = await readResponse(response, fallbackMessage);
        if (!Array.isArray(pageGuests)) {
            throw new Error("The guests response was not a list.");
        }

        guests.push(...pageGuests);
        const totalHeader = response.headers.get("X-Total-Count");
        if (totalHeader !== null) {
            const parsedTotal = Number(totalHeader);
            if (Number.isFinite(parsedTotal) && parsedTotal >= 0) total = parsedTotal;
        }

        hasMore = pageGuests.length === limit && (total === null || guests.length < total);
        page += 1;
    }

    return guests;
}

export function getGuests() {
    return listGuests("/guests", "Could not load guests.");
}

export function getFrontDeskGuests() {
    return listGuests("/guests/frontdesk", "Could not load front desk guests.");
}

export async function getGuestHistory(guestId) {
    const response = await apiFetch(`/guests/${encodeURIComponent(guestId)}/history`);
    const activities = await readResponse(response, "Could not load guest activity history.");
    if (!Array.isArray(activities)) {
        throw new Error("The guest activity response was not a list.");
    }
    return activities;
}

export async function softDeleteGuest(guestId) {
    if (!guestId) {
        throw new Error("A guest ID is required to delete a guest.");
    }

    const response = await apiFetch(`/guests/${encodeURIComponent(guestId)}`, {
        method: "DELETE",
    });
    return readResponse(response, "Could not delete guest.");
}
