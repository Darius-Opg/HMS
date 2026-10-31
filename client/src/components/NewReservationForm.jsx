import { useEffect, useState } from "react";
import { calculateTotalFees } from "../lib/rates.js";
import { checkRoomNumberAvailability, findGuestByIdNumber, reserveRoom } from "../lib/roomApi.js";

function getLocalDateTimeValue() {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

export default function NewReservationForm({ onClose, onCreated }) {
    const [roomNumber, setRoomNumber] = useState("");
    const [checkInDate, setCheckInDate] = useState(getLocalDateTimeValue);
    const [period, setPeriod] = useState("1");
    const [periodUnit, setPeriodUnit] = useState("hours");
    const [roomStatus, setRoomStatus] = useState("RESERVED");
    const [availability, setAvailability] = useState({ status: "idle", result: null, error: "" });
    const [idNumber, setIdNumber] = useState("");
    const [guestLookup, setGuestLookup] = useState({ status: "idle", guest: null, error: "" });
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState("");
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState("");

    useEffect(() => {
        const normalizedRoomNumber = roomNumber.trim();
        const duration = Number(period);
        if (!normalizedRoomNumber || !checkInDate || !Number.isFinite(duration) || duration <= 0) {
            setAvailability({ status: "idle", result: null, error: "" });
            return undefined;
        }

        let cancelled = false;
        setAvailability({ status: "checking", result: null, error: "" });
        const timeoutId = window.setTimeout(async () => {
            try {
                const result = await checkRoomNumberAvailability({
                    roomNumber: normalizedRoomNumber,
                    checkInDate: new Date(checkInDate).toISOString(),
                    period: duration,
                    periodUnit,
                });
                if (!cancelled) setAvailability({ status: "checked", result, error: "" });
            } catch (error) {
                if (!cancelled) {
                    setAvailability({
                        status: "error",
                        result: null,
                        error: error instanceof Error ? error.message : "Could not check room availability.",
                    });
                }
            }
        }, 350);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [roomNumber, checkInDate, period, periodUnit]);

    useEffect(() => {
        const normalizedIdNumber = idNumber.trim();
        if (!normalizedIdNumber) {
            setGuestLookup({ status: "idle", guest: null, error: "" });
            return undefined;
        }

        let cancelled = false;
        setGuestLookup({ status: "checking", guest: null, error: "" });
        const timeoutId = window.setTimeout(async () => {
            try {
                const guest = await findGuestByIdNumber(normalizedIdNumber);
                if (cancelled) return;
                if (guest) {
                    setFirstName(guest.firstName ?? "");
                    setLastName(guest.lastName ?? "");
                    setPhoneNumber(guest.phoneNumber ?? "");
                    setEmail(guest.email ?? "");
                    setGuestLookup({ status: "found", guest, error: "" });
                } else {
                    setFirstName("");
                    setLastName("");
                    setPhoneNumber("");
                    setEmail("");
                    setGuestLookup({ status: "not-found", guest: null, error: "" });
                }
            } catch (error) {
                if (!cancelled) {
                    setGuestLookup({
                        status: "error",
                        guest: null,
                        error: error instanceof Error ? error.message : "Could not look up guest.",
                    });
                }
            }
        }, 400);

        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [idNumber]);

    const room = availability.result?.room;
    const hourlyRate = room?.roomType?.basePrice;
    const totalFees = calculateTotalFees(hourlyRate, period, periodUnit);
    const isRoomAvailable = availability.status === "checked" && availability.result?.available === true;
    const isGuestReady = guestLookup.status === "found"
        ? Boolean(guestLookup.guest?.id)
        : guestLookup.status !== "checking"
            && Boolean(firstName.trim() && lastName.trim() && phoneNumber.trim() && idNumber.trim());

    function updateRoomNumber(value) {
        setRoomNumber(value);
        setAvailability({ status: value.trim() ? "checking" : "idle", result: null, error: "" });
    }

    function updateGuestIdNumber(value) {
        setIdNumber(value);
        setGuestLookup({ status: value.trim() ? "checking" : "idle", guest: null, error: "" });
        setFirstName("");
        setLastName("");
        setPhoneNumber("");
        setEmail("");
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmissionError("");
        setIsSubmitting(true);
        try {
            await reserveRoom({
                roomNumber: roomNumber.trim(),
                guestId: guestLookup.guest?.id,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phoneNumber: phoneNumber.trim(),
                idNumber: idNumber.trim(),
                email: email.trim() || undefined,
                checkInDate: new Date(checkInDate).toISOString(),
                period: Number(period),
                periodUnit,
                paidAmount: isPartialPayment ? Number(partialPaymentAmount) : undefined,
                roomStatus,
            });
            await onCreated?.();
            onClose();
        } catch (error) {
            setSubmissionError(error instanceof Error ? error.message : "Could not create reservation.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <header className="space-y-1 pr-10 text-center">
                <h2 className="app-accent-title text-xl font-semibold">New reservation</h2>
                <p className="app-muted-text text-sm">Enter guest details and check room availability.</p>
            </header>

            <fieldset className="space-y-2">
                <legend className="app-accent-label mb-2">Stay status</legend>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Book or reserve room">
                    <button type="button" aria-pressed={roomStatus === "OCCUPIED"} onClick={() => setRoomStatus("OCCUPIED")} className={`app-button ${roomStatus === "OCCUPIED" ? "app-button-primary" : ""}`}>
                        Book now
                    </button>
                    <button type="button" aria-pressed={roomStatus === "RESERVED"} onClick={() => setRoomStatus("RESERVED")} className={`app-button ${roomStatus === "RESERVED" ? "app-button-primary" : ""}`}>
                        Reserve
                    </button>
                </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-1">
                    <span className="app-accent-label">Room number</span>
                    <input value={roomNumber} onChange={(event) => updateRoomNumber(event.target.value)} required className="app-input h-10 w-full" placeholder="Enter room number" />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                    <span className="app-accent-label">ID number / passport</span>
                    <input value={idNumber} onChange={(event) => updateGuestIdNumber(event.target.value)} required className="app-input h-10 w-full" placeholder="Enter ID or passport number" />
                </label>
                <div className="flex min-w-0 flex-col gap-1 text-sm sm:col-span-2" aria-live="polite">
                    {availability.status === "checking" && <span className="app-muted-text">Checking availability…</span>}
                    {availability.status === "checked" && availability.result?.available && <span className="text-emerald-700 dark:text-emerald-300">Available{room?.roomType?.name ? ` · ${room.roomType.name}` : ""}</span>}
                    {availability.status === "checked" && !availability.result?.available && <span className="text-red-700 dark:text-red-300">{availability.result?.reason || "Room is not available for these dates."}</span>}
                    {availability.status === "error" && <span role="alert" className="text-red-700 dark:text-red-300">{availability.error}</span>}
                    {availability.status === "idle" && <span className="app-muted-text">Availability checks as you enter the stay details.</span>}
                </div>
            </div>

            {guestLookup.status === "checking" && <p className="app-muted-text text-sm" role="status">Looking up guest…</p>}
            {guestLookup.status === "found" && (
                <div className="app-card grid gap-3 p-4 sm:grid-cols-2" aria-live="polite">
                    <div><p className="app-accent-label">Guest</p><p className="mt-1 font-medium">{[firstName, lastName].filter(Boolean).join(" ")}</p></div>
                    <div><p className="app-accent-label">Phone</p><p className="mt-1 font-medium">{phoneNumber || "Not on file"}</p></div>
                    <div className="sm:col-span-2"><p className="app-accent-label">Email</p><p className="mt-1 font-medium">{email || "Not on file"}</p></div>
                </div>
            )}
            {guestLookup.status === "not-found" && <p className="app-muted-text text-sm">Guest not found. Enter their contact details below.</p>}
            {guestLookup.status === "error" && <p role="alert" className="app-error text-sm">{guestLookup.error} Enter the guest details below.</p>}
            {guestLookup.status !== "found" && guestLookup.status !== "checking" && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex min-w-0 flex-col gap-1"><span className="app-accent-label">First name</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} required className="app-input h-10 w-full" /></label>
                        <label className="flex min-w-0 flex-col gap-1"><span className="app-accent-label">Last name</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} required className="app-input h-10 w-full" /></label>
                    </div>
                    <label className="flex min-w-0 flex-col gap-1"><span className="app-accent-label">Phone number</span><input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required className="app-input h-10 w-full" /></label>
                    <label className="flex min-w-0 flex-col gap-1"><span className="app-accent-label">Email (optional)</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="app-input h-10 w-full" /></label>
                </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-1"><span className="app-accent-label">Check-in date and time</span><input type="datetime-local" value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} required className="app-input h-10 w-full" /></label>
                <fieldset className="grid min-w-0 grid-cols-2 gap-2">
                    <label className="flex min-w-0 flex-col gap-1"><span className="app-accent-label">Stay period</span><input type="number" min="1" step="1" value={period} onChange={(event) => setPeriod(event.target.value)} required className="app-input h-10 w-full" /></label>
                    <label className="flex min-w-0 flex-col gap-1"><span className="app-accent-label">Period unit</span><select value={periodUnit} onChange={(event) => setPeriodUnit(event.target.value)} className="app-input h-10 w-full"><option value="hours">Hours</option><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option></select></label>
                </fieldset>
            </div>

            <fieldset className="space-y-3">
                <legend className="app-accent-label mb-2">Payment type</legend>
                <div className="flex flex-wrap gap-4">
                    <label className="app-accent-label flex items-center gap-2"><input type="radio" name="new-reservation-payment" checked={!isPartialPayment} onChange={() => setIsPartialPayment(false)} />Full payment</label>
                    <label className="app-accent-label flex items-center gap-2"><input type="radio" name="new-reservation-payment" checked={isPartialPayment} onChange={() => setIsPartialPayment(true)} />Partial payment</label>
                </div>
                {isPartialPayment && <label className="flex min-w-0 flex-col gap-1"><span className="app-accent-label">Partial payment amount</span><input type="number" min="0.01" max={totalFees ?? undefined} step="0.01" value={partialPaymentAmount} onChange={(event) => setPartialPaymentAmount(event.target.value)} required className="app-input h-10 w-full" placeholder="Amount paid" /></label>}
            </fieldset>

            <label className="flex min-w-0 flex-col gap-1"><span className="app-accent-label">Total fees</span><input readOnly value={totalFees === null ? "Enter an available room" : totalFees.toFixed(2)} className="app-input h-10 w-full" /></label>

            {submissionError && <p role="alert" className="app-error text-sm">{submissionError}</p>}
            <div className="flex justify-end gap-2 border-t border-[#AB784D]/25 pt-4">
                <button type="button" onClick={onClose} disabled={isSubmitting} className="app-button">Cancel</button>
                <button type="submit" disabled={isSubmitting || !isRoomAvailable || !isGuestReady || totalFees === null} className="app-button-primary disabled:cursor-not-allowed disabled:opacity-50">
                    {isSubmitting ? "Saving…" : roomStatus === "OCCUPIED" ? "Book room" : "Reserve room"}
                </button>
            </div>
        </form>
    );
}
