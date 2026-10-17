import { apiFetch } from "./api.js";

export async function getReservations() {
    const response = await apiFetch("/reservations");
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || "Failed to load reservations");
    }
    if (!Array.isArray(data)) {
        throw new Error("The reservations response was invalid");
    }
    return data;
}
