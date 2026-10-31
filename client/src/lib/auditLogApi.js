import { apiFetch } from "./api.js";

export async function listAuditLogs({ page = 1, limit = 50, from, to, search = "" }) {
    const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
    });
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (search.trim()) query.set("search", search.trim());

    const response = await apiFetch(`/audit-logs?${query}`);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || "Could not load audit logs.");
    }
    if (!data || !Array.isArray(data.items)) {
        throw new Error("The audit logs response was invalid.");
    }
    return data;
}
