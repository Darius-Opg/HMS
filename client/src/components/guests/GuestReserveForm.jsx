import { useState } from "react";
import { calculateTotalFees } from "../../lib/rates.js";

function getLocalDateTimeValue() {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export default function GuestReserveForm({
    guest,
    room = guest.room,
    onSubmit,
    onClose,
    isSubmitting = false,
    error = "",
}) {
    const [roomStatus, setRoomStatus] = useState("RESERVED");
    const [period, setPeriod] = useState("1");
    const [periodUnit, setPeriodUnit] = useState("hours");
    const [checkInDate, setCheckInDate] = useState(getLocalDateTimeValue);
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
    const roomNumber = room?.roomNumber ?? guest.roomNumber ?? guest.currentRoom;
    const hourlyRate = room?.roomType?.basePrice ?? room?.basePrice;
    const totalFees = calculateTotalFees(hourlyRate, period, periodUnit);
    const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(" ") || guest.name || "Unknown guest";
    const hasRequiredGuestDetails = Boolean(guest.id || (
        guest.firstName
        && guest.lastName
        && (guest.phone ?? guest.phoneNumber)
        && (guest.idNumber ?? guest.passportNumber)
    ));

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit({
            roomNumber,
            guestId: guest.id,
            firstName: guest.firstName,
            lastName: guest.lastName,
            phoneNumber: guest.phone ?? guest.phoneNumber,
            idNumber: guest.idNumber ?? guest.passportNumber,
            email: guest.email || undefined,
            checkInDate,
            period: Number(period),
            periodUnit,
            paidAmount: isPartialPayment ? Number(partialPaymentAmount) : undefined,
            roomStatus,
        });
    }

    return (
        <form id="guest-reserve-form" onSubmit={handleSubmit} className="space-y-5">
            <header className="space-y-1 pr-10">
                <h2 className="app-accent-title text-xl font-semibold">Reserve a room</h2>
                <p className="app-muted-text text-sm">Create a stay for {guestName}.</p>
            </header>

            <div className="app-card grid gap-4 p-4 sm:grid-cols-2">
                <div>
                    <p className="app-accent-label">Guest</p>
                    <p className="mt-1 font-medium">{guestName}</p>
                </div>
                <div>
                    <p className="app-accent-label">Room</p>
                    <p className="mt-1 font-medium">{roomNumber || "Room unavailable"}</p>
                </div>
            </div>
            {!hasRequiredGuestDetails && (
                <p className="app-error text-sm" role="alert">
                    This guest is missing a required name, phone number, or ID/passport number and cannot be booked until the guest details are complete.
                </p>
            )}

            <fieldset className="space-y-2">
                <legend className="app-accent-label mb-2">Action</legend>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Book or reserve room">
                    <button
                        type="button"
                        aria-pressed={roomStatus === "OCCUPIED"}
                        onClick={() => setRoomStatus("OCCUPIED")}
                        className={`app-button ${roomStatus === "OCCUPIED" ? "app-button-primary" : ""}`}
                    >
                        Book
                    </button>
                    <button
                        type="button"
                        aria-pressed={roomStatus === "RESERVED"}
                        onClick={() => setRoomStatus("RESERVED")}
                        className={`app-button ${roomStatus === "RESERVED" ? "app-button-primary" : ""}`}
                    >
                        Reserve
                    </button>
                </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-1">
                    <span className="app-accent-label">Check-in date and time</span>
                    <input
                        type="datetime-local"
                        value={checkInDate}
                        onChange={(event) => setCheckInDate(event.target.value)}
                        required
                        className="app-input h-10 w-full"
                    />
                </label>
                <fieldset className="grid min-w-0 grid-cols-2 gap-2">
                    <label className="flex min-w-0 flex-col gap-1">
                        <span className="app-accent-label">Stay period</span>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            value={period}
                            onChange={(event) => setPeriod(event.target.value)}
                            required
                            className="app-input h-10 w-full"
                        />
                    </label>
                    <label className="flex min-w-0 flex-col gap-1">
                        <span className="app-accent-label">Period unit</span>
                        <select
                            value={periodUnit}
                            onChange={(event) => setPeriodUnit(event.target.value)}
                            className="app-input h-10 w-full"
                        >
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                        </select>
                    </label>
                </fieldset>
            </div>

            <fieldset className="space-y-3">
                <legend className="app-accent-label mb-2">Payment type</legend>
                <div className="flex flex-wrap gap-4">
                    <label className="app-accent-label flex items-center gap-2">
                        <input
                            type="radio"
                            name="guest-payment-type"
                            checked={!isPartialPayment}
                            onChange={() => setIsPartialPayment(false)}
                            className="accent-[#D4AF7A]"
                        />
                        Full payment
                    </label>
                    <label className="app-accent-label flex items-center gap-2">
                        <input
                            type="radio"
                            name="guest-payment-type"
                            checked={isPartialPayment}
                            onChange={() => setIsPartialPayment(true)}
                            className="accent-[#D4AF7A]"
                        />
                        Partial payment
                    </label>
                </div>
                {isPartialPayment && (
                    <label className="flex min-w-0 flex-col gap-1">
                        <span className="app-accent-label">Partial payment amount</span>
                        <input
                            type="number"
                            min="0.01"
                            max={totalFees ?? undefined}
                            step="0.01"
                            value={partialPaymentAmount}
                            onChange={(event) => setPartialPaymentAmount(event.target.value)}
                            required
                            className="app-input h-10 w-full"
                            placeholder="Amount paid"
                        />
                    </label>
                )}
            </fieldset>

            <label className="flex min-w-0 flex-col gap-1">
                <span className="app-accent-label">Total fees</span>
                <input
                    type="text"
                    readOnly
                    value={totalFees === null ? "Rate unavailable" : totalFees.toFixed(2)}
                    className="app-input h-10 w-full"
                />
            </label>

            {error && <p className="app-error text-sm" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="app-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || !roomNumber || totalFees === null || !hasRequiredGuestDetails}
                    className="app-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting ? "Submitting..." : roomStatus === "OCCUPIED" ? "Book room" : "Reserve room"}
                </button>
            </div>
        </form>
    );
}
