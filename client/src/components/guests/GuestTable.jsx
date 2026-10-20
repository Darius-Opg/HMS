import { BedDouble, Search, Trash } from "lucide-react";
import { useState } from "react";
import Button from "../Button.jsx";

const EMPTY_FILTERS = {
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
};

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString();
}

function getGuestName(guest) {
    return [guest.firstName, guest.lastName].filter(Boolean).join(" ") || guest.name || "Unknown guest";
}

function getReservationStatus(guest) {
    return String(
        guest.currentReservation?.status
        ?? guest.currentReservationStatus
        ?? guest.reservationStatus
        ?? "",
    ).toUpperCase();
}

function getLastCheckIn(guest) {
    return guest.lastCheckIn ?? guest.lastCheckInDate ?? guest.currentReservation?.checkInDate;
}

function getRoomNumber(guest) {
    return guest.room?.roomNumber ?? guest.roomNumber ?? guest.currentRoom ?? "—";
}

function matchesStatus(guest, filter) {
    if (filter === "all") return true;

    const status = getReservationStatus(guest);
    if (filter === "checkedin") return status === "CHECKED_IN";
    if (filter === "checkedout") return status === "CHECKED_OUT";

    const reservationCount = guest.reservationCount ?? guest.reservations?.length;
    return guest.hasReservations === false || reservationCount === 0;
}

function GuestAction({ guest, onReserveGuest }) {
    return (
        <Button
            onClick={() => onReserveGuest?.(guest)}
            text={<><BedDouble aria-hidden="true" className="h-4 w-4" /> Allocate</>}
            className="inline-flex items-center gap-1 whitespace-nowrap"
        />
    );
}

function GuestActions({ guest, isAdmin, onSoftDelete, onViewHistory, onReserveGuest }) {
    const isRoomAvailable = String(guest.room?.status ?? guest.roomStatus ?? "").toUpperCase() === "AVAILABLE";

    return (
        <div className="flex flex-nowrap items-center gap-2">
            {isAdmin && (
                <>
                    <Button
                        onClick={() => onViewHistory?.(guest)}
                        text="View History"
                        className="whitespace-nowrap"
                    />
                    <button
                        type="button"
                        title={`Soft delete ${getGuestName(guest)}`}
                        aria-label={`Soft delete ${getGuestName(guest)}`}
                        className="app-table-action app-table-action-danger inline-flex items-center justify-center"
                        onClick={() => onSoftDelete?.(guest)}
                    >
                        <Trash aria-hidden="true" className="h-4 w-4" />
                    </button>
                </>
            )}
            {isRoomAvailable && (
                <GuestAction guest={guest} onReserveGuest={onReserveGuest} />
            )}
        </div>
    );
}

function GuestTool({ onFiltersChange, showPrivateDetails }) {
    const [filters, setFilters] = useState(EMPTY_FILTERS);

    function updateFilter(event) {
        const nextFilters = { ...filters, [event.target.name]: event.target.value };
        setFilters(nextFilters);
        onFiltersChange(nextFilters);
    }

    return (
        <section
            aria-label="Guest tools"
            className="app-card mb-4 overflow-hidden text-gray-900 dark:text-white"
        >
            <div className="border-b border-[#AB784D]/15 bg-[#F9F6F2]/50 p-3 dark:border-[#B38A5E]/15 dark:bg-[#0A0A0A]/20 sm:p-4">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                    <label
                        htmlFor="guest-search"
                        className="app-input flex h-10 min-w-0 items-center gap-2 px-3 focus-within:ring-1"
                    >
                        <Search aria-hidden="true" className="app-accent-text h-4 w-4 shrink-0" />
                        <span className="sr-only">Search guests</span>
                        <input
                            id="guest-search"
                            type="search"
                            name="search"
                            value={filters.search}
                            onChange={updateFilter}
                            placeholder={showPrivateDetails
                                ? "Search name, email, phone or ID"
                                : "Search guest name"}
                            className="min-w-0 flex-1 bg-transparent text-xs text-gray-900 outline-none dark:text-white"
                        />
                    </label>
                    <label htmlFor="guest-status" className="sr-only">Filter guests by reservation status</label>
                    <select
                        id="guest-status"
                        name="status"
                        value={filters.status}
                        onChange={updateFilter}
                        className="app-input h-10 min-w-0 px-3 text-xs text-gray-900 outline-none dark:text-white"
                    >
                        <option value="all">All Guests</option>
                        <option value="checkedin">Checked In</option>
                        <option value="checkedout">Checked Out</option>
                        <option value="norooms">No Reservations</option>
                    </select>
                    <label htmlFor="guest-date-from" className="sr-only">Check-in date from</label>
                    <input
                        id="guest-date-from"
                        type="date"
                        name="dateFrom"
                        value={filters.dateFrom}
                        onChange={updateFilter}
                        aria-label="Check-in date from"
                        className="app-input h-10 min-w-0 px-3 text-xs text-gray-900 outline-none dark:text-white"
                    />
                    <label htmlFor="guest-date-to" className="sr-only">Check-in date to</label>
                    <input
                        id="guest-date-to"
                        type="date"
                        name="dateTo"
                        value={filters.dateTo}
                        onChange={updateFilter}
                        aria-label="Check-in date to"
                        className="app-input h-10 min-w-0 px-3 text-xs text-gray-900 outline-none dark:text-white"
                    />
                </div>
            </div>
        </section>
    );
}

export default function GuestTable({
    guests,
    isAdmin,
    showPrivateDetails = true,
    onSoftDelete,
    onViewHistory,
    onReserveGuest,
}) {
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const searchTerm = filters.search.trim().toLocaleLowerCase();
    const filteredGuests = guests.filter((guest) => {
        const searchableValues = [
            getGuestName(guest),
            ...(showPrivateDetails ? [
                guest.phone ?? guest.phoneNumber,
                guest.email,
                guest.idNumber ?? guest.passportNumber,
            ] : []),
        ];
        const checkInDate = getLastCheckIn(guest);
        const checkInDay = checkInDate ? String(checkInDate).slice(0, 10) : "";

        return searchableValues.some((value) => (
            String(value ?? "").toLocaleLowerCase().includes(searchTerm)
        ))
            && matchesStatus(guest, filters.status)
            && (!filters.dateFrom || (checkInDay && checkInDay >= filters.dateFrom))
            && (!filters.dateTo || (checkInDay && checkInDay <= filters.dateTo));
    });

    return (
        <section aria-label="Guest directory">
            <GuestTool onFiltersChange={setFilters} showPrivateDetails={showPrivateDetails} />
            <div className="app-table-container scrollbar-none">
                <table className="app-table min-w-262.5">
                    <thead>
                        <tr>
                            <th scope="col">Guest Name</th>
                            {showPrivateDetails && <th scope="col">Phone</th>}
                            {showPrivateDetails && <th scope="col">Email</th>}
                            {showPrivateDetails && <th scope="col">ID Number / Passport</th>}
                            <th scope="col">Room</th>
                            <th scope="col">Last Check-In</th>
                            <th scope="col">Last Check-Out</th>
                            <th scope="col">Room Status</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredGuests.map((guest) => (
                            <tr key={guest.id} className="whitespace-nowrap ">
                                <td className="font-medium whitespace-nowrap">{getGuestName(guest)}</td>
                                {showPrivateDetails && <td>{guest.phone ?? guest.phoneNumber ?? "—"}</td>}
                                {showPrivateDetails && <td>{guest.email || "—"}</td>}
                                {showPrivateDetails && <td>{guest.idNumber ?? guest.passportNumber ?? "—"}</td>}
                                <td>{getRoomNumber(guest)}</td>
                                <td>{formatDate(getLastCheckIn(guest))}</td>
                                <td>{formatDate(
                                    guest.lastCheckOut
                                    ?? guest.lastCheckOutDate
                                    ?? guest.currentReservation?.checkOutDate,
                                )}</td>
                                <td>
                                    <span className="app-chip whitespace-nowrap">
                                        {(guest.room?.status ?? guest.roomStatus ?? getReservationStatus(guest)) || "—"}
                                    </span>
                                </td>
                                <td>
                                    <GuestActions
                                        guest={guest}
                                        isAdmin={isAdmin}
                                        onSoftDelete={onSoftDelete}
                                        onViewHistory={onViewHistory}
                                        onReserveGuest={onReserveGuest}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredGuests.length === 0 && (
                <p className="app-card app-muted-text mt-4 p-5 text-sm">
                    No guests match the selected filters.
                </p>
            )}
        </section>
    );
}
