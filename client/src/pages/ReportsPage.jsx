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
    const right = 105;
    const top = 24;
    const bottom = 36;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const maxReservations = Math.max(1, ...timeline.map((item) => item.reservations));
    const reservationScale = Math.max(2, Math.ceil(maxReservations / 2) * 2);
    const paymentScale = Math.max(1, ...timeline.map((item) => item.payments));
    const xFor = (index) => timeline.length <= 1
        ? left + plotWidth / 2
        : left + (plotWidth * index) / (timeline.length - 1);
    const yFor = (value) => top + plotHeight - (value / paymentScale) * plotHeight;
    const linePoints = timeline.map((item, index) => `${xFor(index)},${yFor(item.payments)}`).join(" ");
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
                    className="h-64 min-w-[36rem] w-full overflow-visible"
                >
                    {[0, 0.5, 1].map((fraction) => {
                        const y = top + plotHeight * fraction;
                        return (
                            <g key={fraction}>
                                <line x1={left} x2={width - right} y1={y} y2={y} stroke="currentColor" opacity="0.10" strokeDasharray={fraction === 1 ? "0" : "4 6"} />
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
                                    opacity="0.82"
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
                    {timeline.length > 1 && (
                        <polygon
                            points={`${xFor(0)},${top + plotHeight} ${linePoints} ${xFor(timeline.length - 1)},${top + plotHeight}`}
                            fill="#f39513"
                            opacity="0.10"
                        />
                    )}
                    <polyline
                        points={linePoints}
                        fill="none"
                        stroke="#f39513"
                        strokeWidth="3"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                    {timeline.map((point, index) => (
                        <circle
                            key={`payment-${point.date}`}
                            cx={xFor(index)}
                            cy={top + plotHeight - (point.payments / paymentScale) * plotHeight}
                            r="3.5"
                            fill="#f39513"
                            stroke="white"
                            strokeWidth="1.5"
                        >
                            <title>{`${formatDate(point.date)}: ${formatCurrency(point.payments)} tracked payments`}</title>
                        </circle>
                    ))}
                </svg>
            )}
        </div>
    );
}

const reservationStatusSegments = [
    { key: "BOOKED", label: "Booked", color: "#C48A3A" },
    { key: "CHECKED_IN", label: "Checked in", color: "#3F9B78" },
    { key: "CHECKED_OUT", label: "Checked out", color: "#6489B5" },
    { key: "CANCELLED", label: "Cancelled", color: "#C96963" },
];

function ReservationStatusChart({ statuses = {} }) {
    const segments = reservationStatusSegments.map((segment) => ({
        ...segment,
        value: Number(statuses[segment.key] ?? 0),
    }));
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    let startAngle = -90;
    const slices = segments.filter((segment) => segment.value > 0).map((segment) => {
        const endAngle = startAngle + (segment.value / total) * 360;
        const start = {
            x: 90 + 78 * Math.cos((startAngle * Math.PI) / 180),
            y: 90 + 78 * Math.sin((startAngle * Math.PI) / 180),
        };
        const end = {
            x: 90 + 78 * Math.cos((endAngle * Math.PI) / 180),
            y: 90 + 78 * Math.sin((endAngle * Math.PI) / 180),
        };
        const path = segment.value === total
            ? null
            : `M 90 90 L ${start.x} ${start.y} A 78 78 0 ${endAngle - startAngle > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`;
        startAngle = endAngle;
        return { ...segment, path };
    });

    return (
        <section className="app-card min-w-0 p-4 sm:p-5" aria-labelledby="reservation-status-heading">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id="reservation-status-heading" className="font-semibold text-gray-900 dark:text-white">
                Reservation status
                </h2>
                <span className="app-muted-text text-xs">Selected period</span>
            </div>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
                <svg
                    viewBox="0 0 180 180"
                    role="img"
                    aria-label={`Pie chart of reservation statuses for the selected period, ${total} reservations total`}
                    className="size-44 shrink-0 drop-shadow-sm"
                >
                    {total === 0 ? (
                        <circle cx="90" cy="90" r="78" fill="#9CA3AF" opacity="0.22" />
                    ) : slices.map((slice) => slice.path
                        ? (
                            <path key={slice.key} d={slice.path} fill={slice.color} stroke="white" strokeWidth="2">
                                <title>{`${slice.label}: ${slice.value} reservations`}</title>
                            </path>
                        )
                        : (
                            <circle key={slice.key} cx="90" cy="90" r="78" fill={slice.color}>
                                <title>{`${slice.label}: ${slice.value} reservations`}</title>
                            </circle>
                        ))}
                    <circle cx="90" cy="90" r="48" fill="var(--report-chart-hole, #fff)" className="dark:[--report-chart-hole:#1f2937]" />
                    <text x="90" y="86" textAnchor="middle" fill="currentColor" className="fill-gray-900 text-[24px] font-semibold dark:fill-white">{total.toLocaleString()}</text>
                    <text x="90" y="105" textAnchor="middle" fill="currentColor" className="app-muted-text text-[9px]">RESERVATIONS</text>
                </svg>
                <div className="grid w-full gap-2 sm:max-w-44">
                    {segments.map((segment) => (
                        <div key={segment.key} className="space-y-1">
                            <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="app-muted-text inline-flex items-center gap-2">
                                    <i className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                                    {segment.label}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">{segment.value.toLocaleString()}</span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full bg-gray-200/70 dark:bg-white/10">
                                <div className="h-full rounded-full" style={{ width: `${total ? (segment.value / total) * 100 : 0}%`, backgroundColor: segment.color }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
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

function ResultChartCard({ icon: Icon, label, value, detail, timeline, metric, color, formatter, loading }) {
    const peak = Math.max(0, ...timeline.map((point) => Number(point[metric] ?? 0)));
    const chartLabel = metric === "reservations" ? "Daily reservations" : "Daily tracked payments";

    return (
        <article className="app-card flex min-w-0 flex-col p-4">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F3D5A3]/50 text-[#80552F] dark:bg-[#D4AF7A]/20 dark:text-[#F3D5A3]">
                    <Icon size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <h3 className="app-muted-text truncate text-xs">{label}</h3>
                    <p className="truncate text-lg font-semibold text-gray-900 dark:text-white" aria-live="polite">
                        {loading ? "…" : value}
                    </p>
                    <p className="app-muted-text truncate text-[11px]">{detail}</p>
                </div>
            </div>
            <div className="mt-4 border-t border-[#AB784D]/15 pt-3">
                {loading ? (
                    <div className="h-12 animate-pulse rounded-lg bg-gray-200/60 dark:bg-white/5" role="status" aria-label="Loading chart" />
                ) : timeline.length === 0 ? (
                    <p className="app-muted-text py-3 text-center text-xs">No activity to chart</p>
                ) : (
                    <div className="flex h-12 items-end gap-[3px]" role="img" aria-label={`${chartLabel} for the selected period`}>
                        {timeline.map((point) => {
                            const amount = Number(point[metric] ?? 0);
                            const height = peak ? Math.max(amount ? 8 : 2, (amount / peak) * 100) : 2;
                            return (
                                <span
                                    key={point.date}
                                    title={`${formatDate(point.date)}: ${formatter(amount)}`}
                                    className="min-w-0 flex-1 rounded-t-sm transition-opacity"
                                    style={{ height: `${height}%`, backgroundColor: color, opacity: amount === peak && amount > 0 ? 1 : 0.48 }}
                                />
                            );
                        })}
                    </div>
                )}
                <div className="app-muted-text mt-1 flex justify-between text-[10px]">
                    <span>{timeline[0] ? formatDate(timeline[0].date, { day: "numeric", month: "short" }) : ""}</span>
                    <span>{timeline.at(-1) ? formatDate(timeline.at(-1).date, { day: "numeric", month: "short" }) : ""}</span>
                </div>
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
    const busiestReservationDay = timeline.reduce((busiest, point) => (
        point.reservations > (busiest?.reservations ?? 0) ? point : busiest
    ), null);
    const highestPaymentDay = timeline.reduce((highest, point) => (
        point.payments > (highest?.payments ?? 0) ? point : highest
    ), null);
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

                <section className="space-y-3" aria-labelledby="period-highlights-heading">
                    <h2 id="period-highlights-heading" className="font-semibold text-gray-900 dark:text-white">
                        Period highlights
                    </h2>
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                        <ReservationStatusChart statuses={dashboard?.reservationStatuses} />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-span-2">
                            <ResultChartCard
                                icon={CalendarDays}
                                label="Busiest check-in day"
                                value={busiestReservationDay
                                    ? formatDate(busiestReservationDay.date, { day: "numeric", month: "short" })
                                    : "No activity"}
                                detail={busiestReservationDay
                                    ? `${busiestReservationDay.reservations} ${busiestReservationDay.reservations === 1 ? "reservation" : "reservations"} checked in`
                                    : "No reservations in this date range"}
                                timeline={timeline}
                                metric="reservations"
                                color="#C48A3A"
                                formatter={(amount) => `${amount} ${amount === 1 ? "reservation" : "reservations"}`}
                                loading={isLoading}
                            />
                            <ResultChartCard
                                icon={CreditCard}
                                label="Highest payment day"
                                value={highestPaymentDay ? formatCurrency(highestPaymentDay.payments) : "No activity"}
                                detail={highestPaymentDay
                                    ? `Tracked on ${formatDate(highestPaymentDay.date, { day: "numeric", month: "short" })}`
                                    : "No tracked payments in this date range"}
                                timeline={timeline}
                                metric="payments"
                                color="#f39513"
                                formatter={formatCurrency}
                                loading={isLoading}
                            />
                        </div>
                    </div>
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
