import { BedDouble, CalendarDays, CreditCard, FileText, Users } from "lucide-react";

const reportTypes = [
    { value: "RESERVATIONS", label: "Reservations", icon: CalendarDays },
    { value: "GUESTS", label: "Guests", icon: Users },
    { value: "ROOMS", label: "Rooms", icon: BedDouble },
    { value: "PAYMENTS", label: "Payments", icon: CreditCard },
];

export default function ReportsTools({ type, from, to, onTypeChange, onFromChange, onToChange, onGenerate, isGenerating }) {
    return (
        <section className="app-card flex flex-col gap-4 p-4 sm:p-5" aria-label="Report options">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <fieldset className="min-w-0">
                    <legend className="app-accent-label mb-2">Select report type</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                        {reportTypes.map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={type === value}
                                onClick={() => onTypeChange(value)}
                                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF7A] ${
                                    type === value
                                        ? "app-button-primary"
                                        : "app-button"
                                }`}
                            >
                                <Icon size={16} aria-hidden="true" />
                                {label}
                            </button>
                        ))}
                    </div>
                </fieldset>

                <div className="grid grid-cols-2 gap-3 md:min-w-72">
                    <label className="flex flex-col gap-1">
                        <span className="app-accent-label">From</span>
                        <input
                            type="date"
                            value={from}
                            max={to || undefined}
                            onChange={(event) => onFromChange(event.target.value)}
                            className="app-input h-11 w-full"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="app-accent-label">To</span>
                        <input
                            type="date"
                            value={to}
                            min={from || undefined}
                            onChange={(event) => onToChange(event.target.value)}
                            className="app-input h-11 w-full"
                        />
                    </label>
                </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-[#AB784D]/20 pt-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={isGenerating || !from || !to || from > to}
                    className="app-button-primary inline-flex min-h-10 shrink-0 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <FileText size={16} aria-hidden="true" />
                    {isGenerating ? "Generating…" : "Generate report"}
                </button>
            </div>
        </section>
    );
}