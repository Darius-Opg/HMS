import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GuestReservationCard from "../components/ReservedCard";
import ReservationToolBar from "../components/ReservationToolBar";
import { getReservations } from "../lib/reservationApi";
import ReservationModal, { CheckOutCard, UpdateStayForm } from "../components/ReservationUpdateModal";

function getGuestName(guest) {
    return [guest?.firstName, guest?.lastName].filter(Boolean).join(" ");
}

export default function ReservationsPage() {
    const navigate = useNavigate();
    const [reservations, setReservations] = useState([]);
    const [reservationToUpdate, setReservationToUpdate] = useState(null);
    const [checkOutUpdate, setCheckOutUpdate] = useState(null);
    const [filters, setFilters] = useState({
        roomName: "",
        paymentStatus: "",
        checkOutStatus: "",
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

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
                    onNewReservation={() => navigate("/")}
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
                        No reservations yet. Select a room type to create your first reservation.
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
                                    onUpdate={() => setReservationToUpdate(reservation)}
                                    onCheckOut={() => setCheckOutUpdate(reservation)}
                                    extraTimeStayedMinutes={reservation.extraTimeStayedMinutes}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
            {reservationToUpdate && (
                <ReservationModal
                    onClose={() => setReservationToUpdate(null)}
                    title={`Update reservation for room ${reservationToUpdate.room?.roomNumber ?? ""}`}
                >
                    <UpdateStayForm
                        reservation={reservationToUpdate}
                        onClose={() => setReservationToUpdate(null)}
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
                    />
                </ReservationModal>
            )}
        </main>
    );
}
