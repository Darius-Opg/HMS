import { useEffect, useState } from "react";
import { BedDouble, LogOut, UserRound, Users } from "lucide-react";
import ReservationModal from "../components/ReservationUpdateModal.jsx";
import GuestHistory from "../components/guests/GuestHistory.jsx";
import GuestReserveForm from "../components/guests/GuestReserveForm.jsx";
import GuestTable from "../components/guests/GuestTable.jsx";
import StatCard from "../components/guests/StatCard.jsx";
import { getFrontDeskGuests, getGuests, softDeleteGuest } from "../lib/guestApi.js";
import { reserveRoom } from "../lib/roomApi.js";
import { useAuth } from "../context/AuthContext.jsx";

function getGuestReservationStatus(guest) {
    return String(
        guest.currentReservation?.status
        ?? guest.currentReservationStatus
        ?? guest.reservationStatus
        ?? "",
    ).toUpperCase();
}

function hasNoReservations(guest) {
    return guest.hasReservations === false
        || guest.reservationCount === 0
        || (Array.isArray(guest.reservations) && guest.reservations.length === 0);
}

export default function GuestPage({ frontDesk = false }) {
    const { user } = useAuth();
    const isAdmin = !frontDesk && user?.role?.toUpperCase() === "ADMIN";
    const [guests, setGuests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedAction, setSelectedAction] = useState(null);
    const [actionError, setActionError] = useState("");
    const [isActionSubmitting, setIsActionSubmitting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadGuests() {
            setIsLoading(true);
            setError("");
            try {
                const guestList = frontDesk ? await getFrontDeskGuests() : await getGuests();
                if (!cancelled) setGuests(guestList);
            } catch (loadError) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : "Could not load guests.");
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        loadGuests();
        return () => {
            cancelled = true;
        };
    }, [frontDesk, refreshKey]);

    async function confirmSoftDelete() {
        const guest = selectedAction?.guest;
        if (!guest) return;
        const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(" ") || guest.name || "this guest";
        setError("");
        setNotice("");
        setActionError("");
        setIsActionSubmitting(true);
        try {
            await softDeleteGuest(guest.id);
            setGuests((currentGuests) => currentGuests.filter((item) => item.id !== guest.id));
            setNotice(`${guestName} was deleted.`);
            setSelectedAction(null);
        } catch (deleteError) {
            setActionError(deleteError instanceof Error ? deleteError.message : "Could not delete guest.");
        } finally {
            setIsActionSubmitting(false);
        }
    }

    async function submitGuestReservation(details) {
        setActionError("");
        setIsActionSubmitting(true);
        try {
            await reserveRoom(details);
            setNotice(`Room ${details.roomNumber} was ${details.roomStatus === "OCCUPIED" ? "booked" : "reserved"} for ${selectedAction.guest.name || "the guest"}.`);
            setSelectedAction(null);
            setRefreshKey((key) => key + 1);
        } catch (reservationError) {
            setActionError(reservationError instanceof Error ? reservationError.message : "Could not reserve the room.");
        } finally {
            setIsActionSubmitting(false);
        }
    }

    function openAction(type, guest) {
        setActionError("");
        setNotice("");
        setSelectedAction({ type, guest });
    }

    const checkedInCount = guests.filter((guest) => getGuestReservationStatus(guest) === "CHECKED_IN").length;
    const checkedOutCount = guests.filter((guest) => getGuestReservationStatus(guest) === "CHECKED_OUT").length;
    const noReservationCount = guests.filter(hasNoReservations).length;

    return (
        <main className="app-page app-content-with-sidebar min-h-screen px-4 pb-8 pt-20 sm:px-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <header>
                    <h1 className="app-accent-title text-2xl font-semibold">
                        {frontDesk ? "Front Desk Guests" : "Guests"}
                    </h1>
                    <p className="app-muted-text mt-1 text-sm">
                        Guest directory, stay details, and reservation history
                    </p>
                </header>

                <section aria-label="Guest statistics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard cardTitle="Total Guests" cardValue={guests.length} cardIcon={<Users aria-hidden="true" size={20} />} />
                    <StatCard cardTitle="Checked In" cardValue={checkedInCount} cardIcon={<UserRound aria-hidden="true" size={20} />} />
                    <StatCard cardTitle="Checked Out" cardValue={checkedOutCount} cardIcon={<LogOut aria-hidden="true" size={20} />} />
                    <StatCard cardTitle="No Reservations" cardValue={noReservationCount} cardIcon={<BedDouble aria-hidden="true" size={20} />} />
                </section>

                {notice && (
                    <p className="app-card p-4 text-sm text-emerald-700 dark:text-emerald-300" role="status">
                        {notice}
                    </p>
                )}
                {error && (
                    <div className="app-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
                        <p className="app-error">{error}</p>
                        <button
                            type="button"
                            className="app-button self-start"
                            onClick={() => setRefreshKey((key) => key + 1)}
                        >
                            Retry
                        </button>
                    </div>
                )}
                {isLoading && (
                    <p className="app-card app-muted-text p-5 text-sm" role="status">
                        Loading guests...
                    </p>
                )}
                {!isLoading && !error && guests.length === 0 && (
                    <p className="app-card app-muted-text p-5 text-sm">
                        No guests to display.
                    </p>
                )}
                {!isLoading && !error && guests.length > 0 && (
                    <GuestTable
                        guests={guests}
                        isAdmin={isAdmin}
                        showPrivateDetails={!frontDesk}
                        onSoftDelete={(guest) => openAction("delete", guest)}
                        onViewHistory={(guest) => openAction("history", guest)}
                        onReserveGuest={(guest) => openAction("reserve", guest)}
                    />
                )}

                {selectedAction && (
                    <ReservationModal
                        onClose={() => {
                            if (!isActionSubmitting) setSelectedAction(null);
                        }}
                        title={selectedAction.type === "history"
                            ? "Guest activity history"
                            : selectedAction.type === "delete"
                                ? "Confirm guest soft delete"
                                : "Reserve a room for guest"}
                    >
                        {selectedAction.type === "history" ? (
                            <GuestHistory
                                guestId={selectedAction.guest.id}
                                guestName={[selectedAction.guest.firstName, selectedAction.guest.lastName]
                                    .filter(Boolean)
                                    .join(" ") || selectedAction.guest.name || "Unknown guest"}
                            />
                        ) : selectedAction.type === "delete" ? (
                            <section className="space-y-5 pr-8">
                                <div>
                                    <h2 className="app-accent-title text-xl font-semibold">Soft delete guest?</h2>
                                    <p className="app-muted-text mt-2 text-sm">
                                        This will remove {selectedAction.guest.name || "this guest"} from the active guest directory.
                                        The guest record is marked as deleted rather than permanently erased, so related reservation
                                        and audit records can remain available for hotel records.
                                    </p>
                                </div>
                                {actionError && <p className="app-error text-sm" role="alert">{actionError}</p>}
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        disabled={isActionSubmitting}
                                        onClick={() => setSelectedAction(null)}
                                        className="app-button disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isActionSubmitting}
                                        onClick={confirmSoftDelete}
                                        className="app-button border-red-700 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-400 dark:text-red-300 dark:hover:bg-red-950"
                                    >
                                        {isActionSubmitting ? "Deleting..." : "Confirm soft delete"}
                                    </button>
                                </div>
                            </section>
                        ) : (
                            <GuestReserveForm
                                guest={selectedAction.guest}
                                onSubmit={submitGuestReservation}
                                onClose={() => setSelectedAction(null)}
                                isSubmitting={isActionSubmitting}
                                error={actionError}
                            />
                        )}
                    </ReservationModal>
                )}
            </div>
        </main>
    );
}
