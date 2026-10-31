import { useEffect, useMemo, useState } from "react";
import GuestReservationCard from "../components/ReservedCard";
import ReservationToolBar from "../components/ReservationToolBar";
import NewReservationForm from "../components/NewReservationForm";
import {
    adjustReservationDetails,
    cancelReservation,
    checkInReservation,
    confirmCheckOut,
    getReservations,
} from "../lib/reservationApi";
import ReservationModal, { CheckOutCard, UpdateStayForm } from "../components/ReservationUpdateModal";

function getGuestName(guest) {
    return [guest?.firstName, guest?.lastName].filter(Boolean).join(" ");
}

export default function ReservationsPage() {
    const [reservations, setReservations] = useState([]);
    const [isNewReservationOpen, setIsNewReservationOpen] = useState(false);
    const [reservationToUpdate, setReservationToUpdate] = useState(null);
    const [checkOutUpdate, setCheckOutUpdate] = useState(null);
    const [filters, setFilters] = useState({
        roomName: "",
        paymentStatus: "",
        checkOutStatus: "",
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    async function reloadReservations() {
        const data = await getReservations();
        setReservations(data);
        setError("");
    }

    useEffect(() => {
        let cancelled = false;

        getReservations()
            .then((data) => {
                if (!cancelled) {
                    setReservations(data);
                    setError("");
                }
            })
            .catch((loadError) => {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : "Failed to load reservations");
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    async function handleUpdateStay({ reservationId, checkOutTime, paymentType, paidAmount }) {
        await adjustReservationDetails({
            reservationId,
            checkOutTime: new Date(checkOutTime).toISOString(),
            paymentType,
            paidAmount,
        });
        setReservationToUpdate(null);
        try {
            await reloadReservations();
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Failed to refresh reservations");
        }
    }

    async function handleCheckOut(reservation) {
        await confirmCheckOut({ reservationId: reservation.id });
        setCheckOutUpdate(null);
        try {
            await reloadReservations();
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Failed to refresh reservations");
        }
    }

    async function handleCheckIn(reservation) {
        setError("");
        try {
            await checkInReservation({ reservationId: reservation.id });
            await reloadReservations();
        } catch (checkInError) {
            setError(checkInError instanceof Error ? checkInError.message : "Failed to check in guest");
        }
    }

    async function handleCancelReservation(reservation) {
        const guestName = getGuestName(reservation.guest) || "this guest";
        const roomNumber = reservation.room?.roomNumber ?? "this room";
        if (!window.confirm(`Cancel the reservation for ${guestName} in ${roomNumber}?`)) {
            return;
        }

        setError("");
        try {
            await cancelReservation({ reservationId: reservation.id });
        } catch (cancelError) {
            setError(cancelError instanceof Error ? cancelError.message : "Failed to cancel reservation");
            return;
        }

        try {
            await reloadReservations();
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "Failed to refresh reservations");
        }
    }

    const rooms = useMemo(() => (
        [...new Set(reservations.map(({ room }) => room?.roomType?.name).filter(Boolean))]
            .sort((left, right) => left.localeCompare(right))
            .map((roomName) => ({ roomName }))
    ), [reservations]);

    const filteredReservations = useMemo(() => reservations.filter((reservation) => (
        (!filters.roomName || reservation.room?.roomType?.name === filters.roomName)
        && (!filters.paymentStatus || reservation.invoice?.paymentStatus === filters.paymentStatus)
        && (!filters.checkOutStatus || reservation.status === filters.checkOutStatus)
    )), [reservations, filters]);

    return (
        <main className="app-page app-content-with-sidebar min-h-screen px-4 pb-8 pt-20 sm:px-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <ReservationToolBar
                    rooms={rooms}
                    initialFilters={filters}
                    onFiltersChange={setFilters}
                    onNewReservation={() => setIsNewReservationOpen(true)}
                />

                {isLoading && (
                    <p className="app-card app-muted-text p-5 text-sm" role="status">
                        Loading reservations…
                    </p>
                )}

                {!isLoading && error && (
                    <p className="app-card border-red-300 bg-white/80 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-[#1E1E1E]/80 dark:text-red-300" role="alert">
                        {error}
                    </p>
                )}

                {!isLoading && !error && reservations.length === 0 && (
                    <p className="app-card app-muted-text p-5 text-sm">
                        No reservations yet. Create one with the New Reservation button.
                    </p>
                )}

                {!isLoading && !error && reservations.length > 0 && filteredReservations.length === 0 && (
                    <p className="app-card app-muted-text p-5 text-sm">
                        No reservations match the selected filters.
                    </p>
                )}

                {!isLoading && !error && filteredReservations.length > 0 && (
                    <section aria-label="Guest reservations">
                        <p className="app-muted-text mb-3 text-sm">
                            Showing {filteredReservations.length} of {reservations.length} reservations
                        </p>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                            {filteredReservations.map((reservation) => (
                                <GuestReservationCard
                                    key={reservation.id}
                                    guestName={getGuestName(reservation.guest)}
                                    roomNumber={reservation.room?.roomNumber}
                                    roomStatus={reservation.room?.status}
                                    paymentStatus={reservation.invoice?.paymentStatus}
                                    amountPaid={reservation.invoice?.amountPaid}
                                    isOverdue={
                                        reservation.status !== "CHECKED_OUT"
                                        && reservation.status !== "CANCELLED"
                                        && Boolean(reservation.checkOutDate)
                                        && new Date(reservation.checkOutDate) < new Date()
                                    }
                                    balance={reservation.balance}
                                    checkOutDate={reservation.checkOutDate}
                                    reservationStatus={reservation.status}
                                    onUpdate={() => setReservationToUpdate(reservation)}
                                    onCheckIn={() => handleCheckIn(reservation)}
                                    onCheckOut={() => setCheckOutUpdate(reservation)}
                                    onCancel={() => handleCancelReservation(reservation)}
                                    extraTimeStayedMinutes={reservation.extraTimeStayedMinutes}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
            {isNewReservationOpen && (
                <ReservationModal
                    onClose={() => setIsNewReservationOpen(false)}
                    title="Create a new reservation"
                >
                    <NewReservationForm
                        onClose={() => setIsNewReservationOpen(false)}
                        onCreated={async () => {
                            try {
                                await reloadReservations();
                            } catch (loadError) {
                                setError(loadError instanceof Error ? loadError.message : "Failed to refresh reservations");
                            }
                        }}
                    />
                </ReservationModal>
            )}
            {reservationToUpdate && (
                <ReservationModal
                    onClose={() => setReservationToUpdate(null)}
                    title={`Update reservation for room ${reservationToUpdate.room?.roomNumber ?? ""}`}
                >
                    <UpdateStayForm
                        reservation={reservationToUpdate}
                        onClose={() => setReservationToUpdate(null)}
                        onSubmit={handleUpdateStay}
                    />
                </ReservationModal>
            )}
            {checkOutUpdate && (
                <ReservationModal
                    onClose={() => setCheckOutUpdate(null)}
                    title={`Checking out room ${checkOutUpdate.room?.roomNumber ?? ""}`}
                >
                    <CheckOutCard
                        onClose={() => setCheckOutUpdate(null)}
                        reservation={checkOutUpdate}
                        onSubmit={handleCheckOut}
                    />
                </ReservationModal>
            )}
        </main>
    );
}
