import { useEffect, useState } from "react";
import { BedDouble, CircleAlert, Coins, UserRound, X } from "lucide-react";

export default function ReservationModal({ onClose, children, title = "Reservation details" }) {
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape") onClose();
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="app-modal-overlay fixed inset-0 z-30 flex items-start justify-center overflow-y-auto scrollbar-none p-3 sm:p-6"

        >
            <div
                className="app-modal relative my-auto mt-8 w-full max-w-2xl max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain scrollbar-none p-5 sm:mt-10 sm:max-h-[calc(100dvh-4rem)] sm:p-8"
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="app-button absolute right-4 top-4 inline-flex size-9 items-center justify-center p-0"
                    aria-label="Close dialog"
                >
                    <X aria-hidden="true" size={18} />
                </button>
                {children}
            </div>
        </div>
    );
}

function toLocalDateTimeValue(date) {
    if (!date) return "";
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "";

    const timezoneOffset = parsedDate.getTimezoneOffset() * 60_000;
    return new Date(parsedDate.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export function UpdateStayForm({ onClose, onSubmit, reservation }) {
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
    const [checkOutTime, setCheckOutTime] = useState(() => toLocalDateTimeValue(reservation?.checkOutDate));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState("");
    const roomNumber = reservation?.room?.roomNumber;
    const guestName = [reservation?.guest?.firstName, reservation?.guest?.lastName]
        .filter(Boolean)
        .join(" ");
    const balance = new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        minimumFractionDigits: 2,
    }).format(Number(reservation?.balance ?? 0));

    async function handleSubmit(event) {
        event.preventDefault();
        if (!onSubmit) return;

        setIsSubmitting(true);
        setSubmissionError("");
        try {
            await onSubmit({
                reservationId: reservation?.id,
                checkOutTime,
                paymentType: isPartialPayment ? "PARTIAL" : "FULL",
                paidAmount: isPartialPayment ? Number(partialPaymentAmount) : undefined,
            });
        } catch (error) {
            setSubmissionError(error instanceof Error ? error.message : "Failed to update reservation");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1 pr-10 text-center">
                <h1 className="app-accent-title">Update Stay</h1>
                <p className="app-muted-text text-sm">
                    {roomNumber ? `Reservation for room ${roomNumber}` : "Update reservation details"}
                </p>
            </div>

            <div className="app-card flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                    <p className="app-accent-label">Guest Name</p>
                    <h2 className="mt-1 wrap-break-words text-lg app-accent-title font-semibold text-left">
                        {guestName || "Unknown Guest"}
                    </h2>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <Coins
                        aria-hidden="true"
                        className="shrink-0 text-[#AB784D] dark:text-[#D4AF7A]"
                        size={20}
                    />
                    <div>
                        <p className="app-accent-label">Current Balance</p>
                        <p className="mt-0.5 text-sm font-semibold">{balance}</p>
                    </div>
                </div>
            </div>

            <fieldset className="flex w-full min-w-0 flex-col gap-2">
                <label htmlFor="reservation-check-out-time" className="app-accent-label">
                    Check-out date and time
                </label>
                <input
                    id="reservation-check-out-time"
                    type="datetime-local"
                    className="app-input w-full bg-white dark:bg-slate-600 dark:text-white"
                    onChange={(event) => setCheckOutTime(event.target.value)}
                    value={checkOutTime}
                    name="checkOutTime"
                    required
                />
            </fieldset>

            <fieldset className="flex w-full min-w-0 flex-col gap-3">
                <legend className="app-accent-label mb-2">Payment type</legend>
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <label className="app-muted-text flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            name="paymentType"
                            value="FULL"
                            checked={!isPartialPayment}
                            onChange={() => setIsPartialPayment(false)}
                            className="accent-[#D4AF7A] dark:accent-[#B38A5E]"
                        />
                        Full payment
                    </label>

                    <label className="app-muted-text flex items-center gap-2 text-sm">
                        <input
                            type="radio"
                            name="paymentType"
                            value="PARTIAL"
                            checked={isPartialPayment}
                            onChange={() => setIsPartialPayment(true)}
                            className="accent-[#D4AF7A] dark:accent-[#B38A5E]"
                        />
                        Partial payment
                    </label>
                </div>

                {isPartialPayment && (
                    <fieldset className="flex w-full min-w-0 flex-col gap-2">
                        <label htmlFor="reservation-partial-payment" className="app-accent-label">
                            Partial payment amount
                        </label>
                        <input
                            id="reservation-partial-payment"
                            type="number"
                            min="0.01"
                            step="0.01"
                            name="partialPaymentAmount"
                            value={partialPaymentAmount}
                            onChange={(event) => setPartialPaymentAmount(event.target.value)}
                            className="app-input w-full bg-white dark:bg-slate-600 dark:text-white"
                            placeholder="Enter amount"
                            required
                        />
                    </fieldset>
                )}
            </fieldset>

            {submissionError && (
                <p className="app-error text-sm" role="alert">{submissionError}</p>
            )}

            <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#AB784D]/25 pt-5 sm:flex-row">
                <button type="button" onClick={onClose} className="app-button">
                    Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="app-button-primary">
                    {isSubmitting ? "Saving..." : "Save changes"}
                </button>
            </div>
        </form>
    );
}

export function CheckOutCard({ onClose, onSubmit, reservation }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState("");
    const roomNumber = reservation?.room?.roomNumber;
    const guestName = [reservation?.guest?.firstName, reservation?.guest?.lastName]
        .filter(Boolean)
        .join(" ");

    async function handleCheckOut() {
        if (!onSubmit) return;

        setIsSubmitting(true);
        setSubmissionError("");
        try {
            await onSubmit(reservation);
        } catch (error) {
            setSubmissionError(error instanceof Error ? error.message : "Failed to check out guest");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2 pr-10 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    <CircleAlert aria-hidden="true" size={28} />
                </div>
                <h1 className="app-accent-title">Check Out Guest</h1>
                <p className="app-muted-text text-sm">
                    Confirm checkout for room {roomNumber ?? "—"}.
                </p>
            </div>

            <div className="app-card grid gap-4 p-4 sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-3">
                    <UserRound aria-hidden="true" className="shrink-0 text-[#AB784D] dark:text-[#D4AF7A]" size={22} />
                    <div className="min-w-0">
                        <p className="app-accent-label">Guest</p>
                        <h2 className="mt-1 wrap-break-words text-lg font-semibold">
                            {guestName || "Unknown Guest"}
                        </h2>
                    </div>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                    <BedDouble aria-hidden="true" className="shrink-0 text-[#AB784D] dark:text-[#D4AF7A]" size={22} />
                    <div>
                        <p className="app-accent-label">Room</p>
                        <p className="mt-1 text-lg font-semibold">{roomNumber ?? "—"}</p>
                    </div>
                </div>
            </div>

            <p className="app-muted-text text-sm leading-6">
                Checking out will end this stay and make the room available for another reservation.
            </p>

            {submissionError && (
                <p className="app-error text-sm" role="alert">{submissionError}</p>
            )}

            <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#AB784D]/25 pt-5 sm:flex-row">
                <button type="button" onClick={onClose} className="app-button">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={isSubmitting}
                    className="app-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSubmitting ? "Checking out..." : "Confirm checkout"}
                </button>
            </div>
        </div>
    );
}