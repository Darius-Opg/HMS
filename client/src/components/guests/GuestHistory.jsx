
function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString();
}

export default function GuestHistory({
    guestId,
    guestName,
    history = [],
}) {
    return (
        <article
            aria-label={`History of ${guestName}`}
            data-guest-id={guestId}
            className="space-y-5"
        >
            <div className="relative border-b border-[#AB784D]/20 pb-4 pr-12 dark:border-[#B38A5E]/20">
                <p className="app-accent-label">Guest reservations</p>
                <h2 className="app-accent-title mt-1 text-xl font-semibold">
                    History of {guestName}
                </h2>
               
            </div>

            {history.length > 0 ? (
                <div className="app-table-container max-h-[60vh] overflow-y-auto">
                    <table className="app-table min-w-150">
                        <thead>
                            <tr>
                                <th scope="col">Room</th>
                                <th scope="col">Check-In</th>
                                <th scope="col">Check-Out</th>
                                <th scope="col">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((reservation) => (
                                <tr key={reservation.id}>
                                    <td>{reservation.room?.roomNumber ?? reservation.roomNumber ?? "—"}</td>
                                    <td>{formatDate(reservation.checkInDate)}</td>
                                    <td>{formatDate(reservation.actualCheckOut ?? reservation.checkOutDate)}</td>
                                    <td>
                                        <span className="app-chip">
                                            {reservation.status ?? "—"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="app-card app-muted-text p-5 text-sm" role="status">
                    Reservation history for {guestName} will appear here when the guest history endpoint is available.
                </div>
            )}
        </article>
    );
}
