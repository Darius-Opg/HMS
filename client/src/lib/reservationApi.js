import { apiFetch } from "./api.js";

async function parseResponse(response, fallbackMessage) {
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || fallbackMessage);
    }
    return data;
}

export async function getReservations() {
    const response = await apiFetch("/reservations");
    const data = await parseResponse(response, "Failed to load reservations");
    if (!Array.isArray(data)) {
        throw new Error("The reservations response was invalid");
    }
    return data;
}

export async function adjustReservationDetails({ reservationId, checkOutTime, paymentType, paidAmount }) {
    const response = await apiFetch("/reservations/update", {
        method: "PATCH",
        body: JSON.stringify({ reservationId, checkOutTime, paymentType, paidAmount }),
    });
    return parseResponse(response, "Failed to update reservation details");
}

export async function confirmCheckOut({ reservationId }) {
    const response = await apiFetch("/reservations/checkout", {
        method: "PATCH",
        body: JSON.stringify({ reservationId }),
    });
    return parseResponse(response, "Failed to check out");
}