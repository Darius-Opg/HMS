import { useEffect, useMemo, useState } from "react";
import {
    BedDouble,
    CalendarDays,
    ChartNoAxesCombined,
    CircleAlert,
    CreditCard,
    Download,
    Eye,
    FileText,
    Users,
} from "lucide-react";
import ReportsTools from "../components/reports/ReportsTools";
import ReservationModal from "../components/ReservationUpdateModal";
import {
    generateReport,
    getRecentReports,
    getReportData,
    getReportsDashboard,
} from "../lib/reportsApi";

const reportLabels = {
    RESERVATIONS: "Reservations",
    GUESTS: "Guests",
    ROOMS: "Rooms",
    PAYMENTS: "Payments",
};

const reportColumns = {
    RESERVATIONS: [
        ["checkInDate", "Check-in"],
        ["checkOutDate", "Check-out"],
        ["guest", "Guest"],
        ["room", "Room"],
        ["roomType", "Room type"],
        ["status", "Status"],
        ["totalAmount", "Total"],
        ["amountPaid", "Paid"],
        ["paymentStatus", "Payment status"],
    ],
    GUESTS: [
        ["name", "Guest"],
        ["email", "Email"],
        ["loyaltyTier", "Guest tier"],
        ["reservations", "Reservations"],
        ["createdAt", "Date added"],
    ],
    ROOMS: [
        ["roomNumber", "Room"],
        ["roomType", "Room type"],
        ["floor", "Floor"],
        ["status", "Status"],
    ],
    PAYMENTS: [
        ["updatedAt", "Last updated"],
        ["guest", "Guest"],
        ["room", "Room"],
        ["totalAmount", "Total"],
        ["amountPaid", "Amount paid"],
        ["paymentStatus", "Status"],
    ],
};

function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function initialDateRange() {
    return monthDateRange(0);
}

function monthDateRange(monthsAgo, today = new Date()) {
    const start = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
    const end = monthsAgo === 0
        ? today
        : new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { from: localDateString(start), to: localDateString(end) };
}

function monthPeriodOptions() {
    const today = new Date();
    return Array.from({ length: 10 }, (_, monthsAgo) => {
        const month = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
        return {
            value: String(monthsAgo),
            label: monthsAgo === 0
                ? `This month (${new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month)})`
                : new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month),
        };
    });
}

function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
    if (!value) return "—";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00`)
        : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, options).format(date);
}

function formatCurrency(value) {
    return `KSh ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatAxisCurrency(value) {
    return `KSh ${Number(value || 0).toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 })}`;
}

function columnValue(key, value) {
    if (value === null || value === undefined || value === "") return "—";
    if (["checkInDate", "checkOutDate", "createdAt", "updatedAt"].includes(key)) {
        return formatDate(value, key === "updatedAt" || key === "createdAt"
            ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
            : undefined);
    }
    if (["totalAmount", "amountPaid"].includes(key)) return formatCurrency(value);
    return String(value);
}

function downloadCsv(report) {
    const columns = reportColumns[report.type] ?? [];
    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const lines = [
        columns.map(([, label]) => escapeCsv(label)).join(","),
        ...report.rows.map((row) => columns.map(([key]) => escapeCsv(columnValue(key, row[key]))).join(",")),
    ];
    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.type.toLowerCase()}-${report.period.from}-to-${report.period.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function TrendChart({ timeline }) {
    const width = 900;
    const height = 270;
    const left = 56;
    const right = 115;
    const top = 18;
    const bottom = 38;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxReservations = Math.max(1, ...timeline.map((item) => item.reservations));
    const reservationScale = Math.max(2, Math.ceil(maxReservations / 2) * 2);
    const paymentScale = Math.max(1, ...timeline.map((item) => item.payments));
    const xFor = (index) => timeline.length <= 1
        ? left + plotWidth / 2
        : left + (plotWidth * index) / (timeline.length - 1);
    const linePoints = timeline.map((item, index) => (
        `${xFor(index)},${top + plotHeight - (item.payments / paymentScale) * plotHeight}`
    )).join(" ");
    const labelStep = Math.max(1, Math.ceil(timeline.length / 6));

    return (
        <div className="w-full overflow-x-auto scrollbar-none">
            {timeline.length === 0 ? (
                <p className="app-muted-text p-8 text-center text-sm">No reservations in this date range.</p>
            ) : (
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    role="img"
                    aria-label="Daily reservations and tracked payments; left scale shows reservations and right scale shows payments in KSh"
                    className="h-64 min-w-[36rem] w-full"
                >
                    {[0, 0.5, 1].map((fraction) => {
                        const y = top + plotHeight * fraction;
                        return (
                            <g key={fraction}>
                                <line x1={left} x2={width - right} y1={y} y2={y} stroke="currentColor" opacity="0.12" />
                                <text x={left - 8} y={y + 4} textAnchor="end" fill="currentColor" className="app-muted-text text-[11px]">
                                    {Math.round(reservationScale * (1 - fraction))}
                                </text>
                                <text x={width - right + 8} y={y + 4} textAnchor="start" fill="currentColor" className="app-muted-text text-[11px]">
                                    {formatAxisCurrency(paymentScale * (1 - fraction))}
                                </text>
                            </g>
                        );
                    })}
                    {timeline.map((point, index) => {
                        const slotWidth = plotWidth / Math.max(timeline.length, 1);
                        const barWidth = Math.max(2, Math.min(20, slotWidth * 0.56));
                        const barHeight = (point.reservations / reservationScale) * plotHeight;
                        return (
                            <g key={point.date}>
                                <title>{`${formatDate(point.date)}: ${point.reservations} reservations, ${formatCurrency(point.payments)} tracked payments`}</title>
                                <rect
                                    x={xFor(index) - barWidth / 2}
                                    y={top + plotHeight - barHeight}
                                    width={barWidth}
                                    height={barHeight}
                                    rx="3"
                                    fill="#D4AF7A"
                                    opacity="0.9"
                                />
                                {(index % labelStep === 0 || index === timeline.length - 1) && (
                                    <text
                                        x={xFor(index)}
                                        y={height - 10}
                                        textAnchor="middle"
                                        fill="currentColor"
                                        className="app-muted-text text-[10px]"
                                    >
                                        {new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    <polyline
                        points={linePoints}
                        fill="none"
                        stroke="#f39513"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                    {timeline.map((point, index) => (
                        <circle
                            key={`payment-${point.date}`}
                            cx={xFor(index)}
                            cy={top + plotHeight - (point.payments / paymentScale) * plotHeight}
                            r="3"
                            fill="#f39513"
                        >
                            <title>{`${formatDate(point.date)}: ${formatCurrency(point.payments)} tracked payments`}</title>
                        </circle>
                    ))}
                </svg>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, detail, loading }) {
    return (
        <article className="app-card flex min-w-0 items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F3D5A3]/50 text-[#80552F] dark:bg-[#D4AF7A]/20 dark:text-[#F3D5A3]">
                <Icon size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <h2 className="app-muted-text truncate text-xs">{label}</h2>
                <p className="truncate text-lg font-semibold text-gray-900 dark:text-white" aria-live="polite">
                    {loading ? "…" : value}
                </p>
                <p className="app-muted-text truncate text-[11px]">{detail}</p>
            </div>
        </article>
    );
}

function ReportTable({ report }) {
    const columns = reportColumns[report.type] ?? [];
    return (
        <div className="app-table-container scrollbar-none">
            <table className="app-table min-w-full">
                <thead>
                    <tr>{columns.map(([, label]) => <th key={label}>{label}</th>)}</tr>
                </thead>
                <tbody>
                    {report.rows.map((row, index) => (
                        <tr key={row.id ?? `${report.type}-${index}`}>
                            {columns.map(([key]) => <td key={key} className="whitespace-nowrap">{columnValue(key, row[key])}</td>)}
                        </tr>
                    ))}
                    {report.rows.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="app-muted-text py-8 text-center">
                                No {reportLabels[report.type]?.toLowerCase() ?? "records"} were found for this report.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default function ReportsPage() {
    const [range, setRange] = useState(initialDateRange);
    const [selectedPeriod, setSelectedPeriod] = useState("0");
    const [periodOptions] = useState(monthPeriodOptions);
    const [type, setType] = useState("RESERVATIONS");
    const [dashboard, setDashboard] = useState(null);
    const [recentReports, setRecentReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState("");
    const [recentError, setRecentError] = useState("");

    useEffect(() => {
        let cancelled = false;
        getReportsDashboard(range)
            .then((data) => {
                if (!cancelled) setDashboard(data);
            })
            .catch((loadError) => {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load report summary.");
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [range]);

    useEffect(() => {
        let cancelled = false;
        getRecentReports()
            .then((reports) => {
                if (!cancelled) {
                    setRecentReports(reports);
                    setRecentError("");
                }
            })
            .catch((loadError) => {
                if (!cancelled) setRecentError(loadError instanceof Error ? loadError.message : "Could not load recent reports.");
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const stats = dashboard?.summary;
    const timeline = dashboard?.timeline ?? [];
    const reportPeriodLabel = useMemo(() => (
        range.from && range.to ? `${formatDate(range.from)} – ${formatDate(range.to)}` : "Choose a date range"
    ), [range]);

    function changeDateRange(field, value) {
        setIsLoading(true);
        setError("");
        setSelectedReport(null);
        setSelectedPeriod("custom");
        setRange((current) => ({ ...current, [field]: value }));
    }

    function changePeriod(value) {
        setSelectedPeriod(value);
        setIsLoading(true);
        setError("");
        setSelectedReport(null);
        setRange(monthDateRange(Number(value)));
    }

    async function handleGenerate() {
        setIsGenerating(true);
        setError("");
        setSelectedReport(null);
        try {
            const report = await generateReport({ ...range, type });
            setSelectedReport(report);
            try {
                const reports = await getRecentReports();
                setRecentReports(reports);
                setRecentError("");
            } catch (loadError) {
                setRecentError(loadError instanceof Error ? loadError.message : "Could not refresh recent reports.");
            }
        } catch (generateError) {
            setError(generateError instanceof Error ? generateError.message : "Could not generate this report.");
        } finally {
            setIsGenerating(false);
        }
    }

    async function showRecentReport(report) {
        setError("");
        try {
            const data = await getReportData({ type: report.type, from: report.from, to: report.to });
            setSelectedReport({ ...data, generatedAt: report.generatedAt, generatedBy: report.generatedBy });
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not open this report.");
        }
    }

    async function downloadRecentReport(report) {
        setError("");
        try {
            const data = await getReportData({ type: report.type, from: report.from, to: report.to });
            downloadCsv(data);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Could not download this report.");
        }
    }

    return (
        <main className="app-page app-content-with-sidebar min-h-screen px-4 pb-8 pt-20 sm:px-6">
            <div className="mx-auto max-w-7xl space-y-5">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F3D5A3]/60 text-[#80552F] dark:bg-[#D4AF7A]/20 dark:text-[#F3D5A3]">
                            <ChartNoAxesCombined size={22} aria-hidden="true" />
                        </span>
                        <div>
                            <h1 className="app-accent-title text-left text-2xl">Reports</h1>
                            <p className="app-muted-text text-sm">View and generate reports using your hotel data.</p>
                        </div>
                    </div>
                    {dashboard?.period && (
                        <span className="app-chip self-start sm:self-auto">{reportPeriodLabel}</span>
                    )}
                </header>

                <ReportsTools
                    type={type}
                    from={range.from}
                    to={range.to}
                    onTypeChange={(nextType) => {
                        setType(nextType);
                        setSelectedReport(null);
                    }}
                    onFromChange={(from) => changeDateRange("from", from)}
                    onToChange={(to) => changeDateRange("to", to)}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                />

                {error && (
                    <p className="app-error" role="alert">
                        <CircleAlert className="mr-2 inline" size={16} aria-hidden="true" />
                        {error}
                    </p>
                )}

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Report summary">
                    <StatCard
                        icon={CalendarDays}
                        label="Reservations"
                        value={stats?.totalReservations?.toLocaleString() ?? "—"}
                        detail="Check-ins within the selected dates"
                        loading={isLoading}
                    />
                    <StatCard
                        icon={Users}
                        label="New guests"
                        value={stats?.totalGuests?.toLocaleString() ?? "—"}
                        detail="Guests registered in this period"
                        loading={isLoading}
                    />
                    <StatCard
                        icon={CreditCard}
                        label="Tracked payments"
                        value={stats ? formatCurrency(stats.totalRevenue) : "—"}
                        detail="Invoice amounts updated in this period"
                        loading={isLoading}
                    />
                    <StatCard
                        icon={BedDouble}
                        label="Current occupancy"
                        value={stats ? `${stats.occupancyRate}%` : "—"}
                        detail="Rooms occupied right now"
                        loading={isLoading}
                    />
                </section>

                <section className="app-card min-w-0 p-4 sm:p-5" aria-labelledby="reservations-overview-heading">
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                        <div className="flex flex-wrap items-end gap-3">
                            <label className="flex flex-col gap-1">
                                <span className="app-accent-label">Viewing month</span>
                                <select
                                    value={selectedPeriod}
                                    onChange={(event) => changePeriod(event.target.value)}
                                    className="app-input h-10 min-w-52"
                                    aria-label="Select report month"
                                >
                                    {selectedPeriod === "custom" && <option value="custom" disabled>Custom date range</option>}
                                    {periodOptions.map(({ value, label }) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </label>
                            <h2 id="reservations-overview-heading" className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                                <ChartNoAxesCombined size={18} className="text-[#f39513]" aria-hidden="true" />
                                Reservations overview
                            </h2>
                        </div>
                        <div className="app-muted-text flex flex-wrap gap-4 text-xs">
                            <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#D4AF7A]" />Reservations</span>
                            <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#f39513]" />Tracked payments</span>
                        </div>
                    </div>
                    {isLoading
                        ? <p className="app-muted-text p-8 text-center text-sm" role="status">Loading report data…</p>
                        : error
                            ? <p className="app-muted-text p-8 text-center text-sm">Chart unavailable.</p>
                            : <TrendChart timeline={timeline} />}
                </section>

                {selectedReport && (
                    <ReservationModal
                        onClose={() => setSelectedReport(null)}
                        title={`${reportLabels[selectedReport.type]} report`}
                        size="wide"
                    >
                        <section className="space-y-4" aria-labelledby="generated-report-heading">
                            <div className="flex flex-col gap-2 pr-10 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2 id="generated-report-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {reportLabels[selectedReport.type]} report
                                    </h2>
                                    <p className="app-muted-text text-sm">
                                        {formatDate(selectedReport.period.from)} – {formatDate(selectedReport.period.to)}
                                        {" · "}{selectedReport.rows.length.toLocaleString()} records
                                    </p>
                                </div>
                                <button type="button" onClick={() => downloadCsv(selectedReport)} className="app-button inline-flex items-center justify-center gap-2">
                                    <Download size={15} aria-hidden="true" />
                                    Download CSV
                                </button>
                            </div>
                            <ReportTable report={selectedReport} />
                        </section>
                    </ReservationModal>
                )}

                <section className="space-y-3" aria-labelledby="recent-reports-heading">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id="recent-reports-heading" className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                            <FileText size={17} className="text-[#f39513]" aria-hidden="true" />
                            Recent reports
                        </h2>
                        <span className="app-muted-text text-xs">Most recently generated</span>
                    </div>
                    {recentError && <p className="app-error" role="alert">{recentError}</p>}
                    {!recentError && recentReports.length === 0 && (
                        <p className="app-card app-muted-text p-5 text-sm">No reports have been generated yet.</p>
                    )}
                    {recentReports.length > 0 && (
                        <div className="app-table-container scrollbar-none">
                            <table className="app-table min-w-[48rem]">
                                <thead>
                                    <tr>
                                        <th>Report type</th>
                                        <th>Date generated</th>
                                        <th>Date range</th>
                                        <th>Generated by</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentReports.map((report) => (
                                        <tr key={report.id}>
                                            <td>{reportLabels[report.type] ?? report.type}</td>
                                            <td>{formatDate(report.generatedAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                                            <td>{formatDate(report.from)} – {formatDate(report.to)}</td>
                                            <td>{report.generatedBy}</td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => showRecentReport(report)}
                                                        className="app-table-action inline-flex items-center gap-1.5"
                                                    >
                                                        <Eye size={14} aria-hidden="true" />
                                                        View
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadRecentReport(report)}
                                                        className="app-table-action inline-flex items-center gap-1.5"
                                                    >
                                                        <Download size={14} aria-hidden="true" />
                                                        Download
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
