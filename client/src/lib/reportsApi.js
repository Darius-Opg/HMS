import { apiFetch } from "./api.js";

async function readResponse(response, fallbackMessage) {
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || fallbackMessage);
    }
    return data;
}

function buildQuery({ from, to, type }) {
    const query = new URLSearchParams({ from, to });
    if (type) query.set("type", type);
    return query.toString();
}

export async function getReportsDashboard({ from, to }) {
    const response = await apiFetch(`/reports/dashboard?${buildQuery({ from, to })}`);
    return readResponse(response, "Could not load report summary.");
}

export async function getReportData({ type, from, to }) {
    const response = await apiFetch(`/reports/data?${buildQuery({ type, from, to })}`);
    return readResponse(response, "Could not load this report.");
}

export async function generateReport({ type, from, to }) {
    const response = await apiFetch("/reports/generate", {
        method: "POST",
        body: JSON.stringify({ type, from, to }),
    });
    return readResponse(response, "Could not generate this report.");
}

export async function getRecentReports() {
    const response = await apiFetch("/reports/recent");
    const reports = await readResponse(response, "Could not load recent reports.");
    if (!Array.isArray(reports)) {
        throw new Error("The recent reports response was not a list.");
    }
    return reports;
}
