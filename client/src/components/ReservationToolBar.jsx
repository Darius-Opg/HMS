import { useState } from "react";
import { BedDouble, CircleCheck, CreditCard, Plus } from "lucide-react";

const DEFAULT_PAYMENT_STATUS_OPTIONS = [
    { value: "PENDING", label: "Pending" },
    { value: "PARTIAL", label: "Partial" },
    { value: "PAID", label: "Paid" },
];

const DEFAULT_CHECK_OUT_STATUS_OPTIONS = [
    { value: "BOOKED", label: "Booked" },
    { value: "CHECKED_IN", label: "Checked In" },
    { value: "CHECKED_OUT", label: "Checked Out" },
    { value: "CANCELLED", label: "Cancelled" },
];

function normalizeOptions(options, getOption) {
    return options.map((option) => (
        typeof option === "string"
            ? { value: option, label: option }
            : getOption(option)
    ));
}

function FilterSelect({ id, filterName, label, icon: Icon, value, onChange, options }) {
    return (
        <label
            htmlFor={id}
            className="app-input flex min-w-0 items-center gap-2 focus-within:ring-1"
        >
            <Icon aria-hidden="true" size={16} className="app-accent-text shrink-0" />
            <span className="sr-only">{label}</span>
            <select
                id={id}
                name={filterName}
                value={value}
                onChange={onChange}
                className="h-10 min-w-0 flex-1 appearance-none bg-transparent text-xs text-gray-900 outline-none dark:text-white"
            >
                <option value="" className="bg-white text-gray-900 dark:bg-[#1E1E1E] dark:text-white">{label}</option>
                {options.map(({ value: optionValue, label: optionLabel }) => (
                    <option key={optionValue} value={optionValue} className="bg-white text-gray-900 dark:bg-[#1E1E1E] dark:text-white">
                        {optionLabel}
                    </option>
                ))}
            </select>
            <span aria-hidden="true" className="app-muted-text text-[10px]">▼</span>
        </label>
    );
}

export function ReservationToolBar({
    rooms = [],
    paymentStatusOptions = DEFAULT_PAYMENT_STATUS_OPTIONS,
    checkOutStatusOptions = DEFAULT_CHECK_OUT_STATUS_OPTIONS,
    onFiltersChange,
    onNewReservation,
    initialFilters,
}) {
    const [filters, setFilters] = useState(() => ({
        roomName: "",
        paymentStatus: "",
        checkOutStatus: "",
        ...initialFilters,
    }));

    function updateFilter(event, filterName = event.target.name) {
        const nextFilters = { ...filters, [filterName]: event.target.value };
        setFilters(nextFilters);
        onFiltersChange?.(nextFilters);
    }

    const roomOptions = normalizeOptions(rooms, (room) => {
        const roomName = room.roomName ?? room.name ?? room.value;
        return {
            value: String(roomName),
            label: room.label ?? String(roomName),
        };
    });
    const normalizedPaymentOptions = normalizeOptions(
        paymentStatusOptions,
        (option) => ({ value: option.value, label: option.label }),
    );
    const normalizedCheckOutOptions = normalizeOptions(
        checkOutStatusOptions,
        (option) => ({ value: option.value, label: option.label }),
    );

    return (
        <section
            aria-label="Reservation tools"
            className="app-card overflow-hidden text-gray-900 dark:text-white"
        >
            <div className="flex flex-col gap-4 border-b border-[#AB784D]/25 px-4 py-4 dark:border-[#B38A5E]/25 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white">
                        Reservations
                    </h1>
                    <p className="app-muted-text mt-1 text-xs">
                        Manage guest reservations and room allocations
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onNewReservation}
                    className="app-button-primary inline-flex min-h-9 items-center justify-center gap-2 self-start sm:self-auto"
                >
                    <Plus aria-hidden="true" size={15} />
                    New Reservation
                </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 border-t border-[#AB784D]/15 bg-[#F9F6F2]/50 p-3 dark:border-[#B38A5E]/15 dark:bg-[#0A0A0A]/20 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
                <FilterSelect
                    id="reservation-room"
                    filterName="roomName"
                    label="All Rooms"
                    icon={BedDouble}
                    value={filters.roomName}
                    onChange={updateFilter}
                    options={roomOptions}
                />
                <FilterSelect
                    id="reservation-payment-status"
                    filterName="paymentStatus"
                    label="All Payment Status"
                    icon={CreditCard}
                    value={filters.paymentStatus}
                    onChange={updateFilter}
                    options={normalizedPaymentOptions}
                />
                <FilterSelect
                    id="reservation-check-out-status"
                    filterName="checkOutStatus"
                    label="All Check-out Status"
                    icon={CircleCheck}
                    value={filters.checkOutStatus}
                    onChange={updateFilter}
                    options={normalizedCheckOutOptions}
                />
            </div>
        </section>
    );
}

export default ReservationToolBar;