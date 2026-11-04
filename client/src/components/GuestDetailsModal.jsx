import ReservationModal from "./ReservationUpdateModal";
import Button from "./Button";

function formatDateTime(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export default function GuestDetailsModal({ guest, onClose, onAllocate, staffView = false }) {
    const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(" ") || "Guest";
    const staffDetails = [
        ["Reservation status", guest.currentReservation?.status ?? guest.currentReservationStatus ?? "No reservation"],
        ["Room number", guest.currentReservation?.room?.roomNumber ?? guest.room?.roomNumber ?? "Not assigned"],
        ["Actual check-in", guest.currentReservation?.actualCheckIn],
        ["Actual check-out", guest.currentReservation?.actualCheckOut],
    ];
    const adminDetails = [
        ["Loyalty tier", guest.loyaltyTier],
        ["Email", guest.email],
        ["Phone", guest.phone],
        ["ID number / passport", guest.idNumber],
        ["Reservation status", guest.currentReservation?.status],
        ["Room", guest.currentReservation?.room?.roomNumber ?? guest.room?.roomNumber],
        ["Scheduled check-in", guest.currentReservation?.checkInDate],
        ["Scheduled check-out", guest.currentReservation?.checkOutDate],
        ["Actual check-in", guest.currentReservation?.actualCheckIn],
        ["Actual check-out", guest.currentReservation?.actualCheckOut],
        ["Last check-in", guest.lastCheckIn],
        ["Last check-out", guest.lastCheckOut],
    ];
    const details = (staffView ? staffDetails : adminDetails)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([label, value]) => [
            label,
            /check-in|check-out/i.test(label) ? formatDateTime(value) : value,
        ]);

    return (
        <ReservationModal onClose={onClose} title={`${guestName} details`}>
            <section className="space-y-5 pr-8">
                <div>
                    <p className="app-accent-label">Guest details</p>
                    <h2 className="app-accent-title mt-1 text-xl font-semibold">{guestName}</h2>
                </div>

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {details.map(([label, value]) => (
                        <div key={label} className="app-card min-w-0 p-3">
                            <dt className="app-accent-label">{label}</dt>
                            <dd className="mt-1 break-words text-sm font-medium text-gray-900 dark:text-white">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
                {onAllocate && (
                    <div className="flex justify-end">
                        <Button
                            text="Create new reservation"
                            onClick={onAllocate}
                        />
                    </div>
                )}
            </section>
        </ReservationModal>
    );
}
