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

function formatCurrency(value) {
    if (value === undefined || value === null || !Number.isFinite(Number(value))) return "Not available";
    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        minimumFractionDigits: 2,
    }).format(Number(value));
}

export default function ReservationDetailsModal({ reservation, onClose, onAllocate }) {
    const guestName = [reservation.guest?.firstName, reservation.guest?.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown guest";
    const hasInvoice = Boolean(reservation.invoice);
    const total = Number(reservation.invoice?.totalAmount ?? 0)
        + Number(reservation.invoice?.extraCharges ?? 0);
    const paid = Number(reservation.invoice?.amountPaid ?? 0);
    const balance = hasInvoice && Number.isFinite(total - paid) ? Math.max(total - paid, 0) : null;
    const bookingType = reservation.room?.status === "RESERVED"
        ? "Reserved"
        : reservation.room?.status === "OCCUPIED"
            ? "Booked"
            : reservation.status ?? "Reservation";
    const fields = [
        ["Guest", guestName],
        ["Room", reservation.room?.roomNumber ?? "Not available"],
        ["Room type", reservation.room?.roomType?.name ?? "Not available"],
        ["Reservation status", reservation.status ?? "Not available"],
        ["Room status", reservation.room?.status ?? "Not available"],
        ["Actual check-in", formatDateTime(reservation.actualCheckIn)],
        ["Actual check-out", formatDateTime(reservation.actualCheckOut)],
        ["Rate at booking", formatCurrency(reservation.rateAtBooking)],
        ["Total amount", formatCurrency(reservation.invoice?.totalAmount)],
        ["Amount paid", formatCurrency(reservation.invoice?.amountPaid)],
        ["Balance", formatCurrency(balance)],
        ["Payment status", reservation.invoice?.paymentStatus ?? "No invoice"],
    ];

    return (
        <ReservationModal onClose={onClose} title={`Reservation for ${guestName}`}>
            <section className="space-y-5 pr-8">
                <div>
                    <p className="app-accent-label">Reservation details</p>
                    <h2 className="app-accent-title mt-1 text-xl font-semibold">
                        Room {reservation.room?.roomNumber ?? "—"}
                    </h2>
                    <p className="app-card app-muted-text mt-4 p-4 text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">
                            {bookingType} from {formatDateTime(reservation.checkInDate)}
                        </span>
                        {" · "}
                        Expected to check out on {formatDateTime(reservation.checkOutDate)}.
                    </p>
                </div>

                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {fields.map(([label, value]) => (
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
                            text="Create new reservation for this guest"
                            onClick={onAllocate}
                        />
                    </div>
                )}
            </section>
        </ReservationModal>
    );
}
