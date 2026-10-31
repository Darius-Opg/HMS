import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Download, FileClock, Search, ShieldAlert } from "lucide-react";
import { listAuditLogs } from "../lib/auditLogApi";

const PAGE_SIZE = 50;

function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDefaultRange() {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    return { from: localDateString(start), to: localDateString(today) };
}

function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "—"
        : new Intl.DateTimeFormat(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
}

function describeMetadata(metadata) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "—";
    const parts = Object.entries(metadata).map(([key, value]) => {
        const displayValue = typeof value === "string" ? value : JSON.stringify(value);
        return `${key}: ${displayValue}`;
    });
    return parts.length ? parts.join(" · ") : "—";
}

function downloadCsv(logs) {
    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const columns = ["Date", "Action", "Record type", "Record ID", "Performed by", "Details"];
    const rows = logs.map((log) => [
        formatDate(log.createdAt),
        log.action,
        log.entityType ?? "",
        log.entityId ?? "",
        log.performedBy,
        describeMetadata(log.metadata),
    ]);
    const csv = [columns, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

export default function AuditLogPage() {
    const { user } = useAuth();
    const [range, setRange] = useState(getDefaultRange);
    const [search, setSearch] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ items: [], total: 0, page: 1, limit: PAGE_SIZE });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const hasAccess = user?.role === "ADMIN" && user?.permissions?.includes("VIEW_AUDIT_LOG");

    useEffect(() => {
        if (!hasAccess) {
            return undefined;
        }

        let cancelled = false;
        listAuditLogs({ ...range, page, limit: PAGE_SIZE, search: appliedSearch })
            .then((data) => {
                if (!cancelled) {
                    setResult(data);
                    setError("");
                }
            })
            .catch((loadError) => {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load audit logs.");
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [appliedSearch, hasAccess, page, range]);

    function updateRange(field, value) {
        setIsLoading(true);
        setError("");
        setPage(1);
        setRange((current) => ({ ...current, [field]: value }));
    }

    function applySearch(event) {
        event.preventDefault();
        setIsLoading(true);
        setError("");
        setPage(1);
        setAppliedSearch(search.trim());
    }

    if (!hasAccess) {
        return (
            <main className="app-page app-content-with-sidebar flex min-h-screen items-center justify-center px-4 pt-20">
                <div className="app-card max-w-lg p-6 text-center">
                    <ShieldAlert className="mx-auto mb-3 text-[#f39513]" size={28} aria-hidden="true" />
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Access restricted</h1>
                    <p className="app-muted-text mt-2 text-sm">You need administrator access and the audit log permission to view this page.</p>
                </div>
            </main>
        );
    }

    const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
    const firstItem = result.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const lastItem = Math.min(page * PAGE_SIZE, result.total);

    return (
        <main className="app-page app-content-with-sidebar min-h-screen px-4 pb-8 pt-20 sm:px-6">
            <div className="mx-auto max-w-7xl space-y-5">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F3D5A3]/60 text-[#80552F] dark:bg-[#D4AF7A]/20 dark:text-[#F3D5A3]">
                            <FileClock size={22} aria-hidden="true" />
                        </span>
                        <div>
                            <h1 className="app-accent-title text-left text-2xl">Audit log</h1>
                            <p className="app-muted-text text-sm">Review recorded activity across the system.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={result.items.length === 0}
                        onClick={() => downloadCsv(result.items)}
                        className="app-button inline-flex min-h-10 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Download size={16} aria-hidden="true" />
                        Download current page
                    </button>
                </header>

                <form onSubmit={applySearch} className="app-card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1fr)_minmax(12rem,auto)_minmax(12rem,auto)_auto] lg:items-end">
                    <label className="flex flex-col gap-1">
                        <span className="app-accent-label">Search activity</span>
                        <span className="relative">
                            <Search className="app-muted-text absolute left-3 top-1/2 -translate-y-1/2" size={16} aria-hidden="true" />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Action, record, or user"
                                className="app-input h-10 w-full pl-9"
                            />
                        </span>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="app-accent-label">From</span>
                        <input
                            type="date"
                            value={range.from}
                            max={range.to}
                            onChange={(event) => updateRange("from", event.target.value)}
                            className="app-input h-10 w-full"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="app-accent-label">To</span>
                        <input
                            type="date"
                            value={range.to}
                            min={range.from}
                            onChange={(event) => updateRange("to", event.target.value)}
                            className="app-input h-10 w-full"
                        />
                    </label>
                    <button type="submit" disabled={range.from > range.to} className="app-button-primary h-10 disabled:cursor-not-allowed disabled:opacity-50">
                        Apply filters
                    </button>
                </form>

                {error && <p className="app-error" role="alert">{error}</p>}

                <section className="space-y-3" aria-labelledby="audit-log-entries-heading">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 id="audit-log-entries-heading" className="font-semibold text-gray-900 dark:text-white">Activity entries</h2>
                        <p className="app-muted-text text-sm" aria-live="polite">
                            {isLoading ? "Loading activity…" : `Showing ${firstItem}–${lastItem} of ${result.total.toLocaleString()}`}
                        </p>
                    </div>
                    <div className="app-table-container">
                        <table className="app-table min-w-[60rem]">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Action</th>
                                    <th>Record type</th>
                                    <th>Record ID</th>
                                    <th>Performed by</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && (
                                    <tr><td colSpan={6} className="app-muted-text py-8 text-center" role="status">Loading audit logs…</td></tr>
                                )}
                                {!isLoading && !error && result.items.map((log) => (
                                    <tr key={log.id}>
                                        <td className="whitespace-nowrap">{formatDate(log.createdAt)}</td>
                                        <td><span className="app-chip">{log.action}</span></td>
                                        <td>{log.entityType || "—"}</td>
                                        <td className="max-w-48 truncate font-mono text-xs" title={log.entityId ?? ""}>{log.entityId || "—"}</td>
                                        <td>{log.performedBy}</td>
                                        <td className="max-w-sm whitespace-normal text-xs">{describeMetadata(log.metadata)}</td>
                                    </tr>
                                ))}
                                {!isLoading && !error && result.items.length === 0 && (
                                    <tr><td colSpan={6} className="app-muted-text py-8 text-center">No audit activity found for these filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <nav className="flex items-center justify-between gap-3" aria-label="Audit log pages">
                    <p className="app-muted-text text-sm">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={page <= 1 || isLoading}
                            onClick={() => {
                                setIsLoading(true);
                                setPage((current) => current - 1);
                            }}
                            className="app-button disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={page >= totalPages || isLoading}
                            onClick={() => {
                                setIsLoading(true);
                                setPage((current) => current + 1);
                            }}
                            className="app-button disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </nav>
            </div>
        </main>
    );
}
