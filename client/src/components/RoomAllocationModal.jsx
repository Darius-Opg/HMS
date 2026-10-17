import { useState } from "react";
import Button from "./Button";
import { reserveRoom } from "../lib/roomApi";
import { calculateTotalFees } from "../lib/rates";

export default function RoomAllocationModal({ room, hourlyRate, onCancel }) {
    const [submissionError, setSubmissionError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function onSubmitAllocation(allocation) {
        setSubmissionError("");
        setIsSubmitting(true);

        try {
            await reserveRoom(allocation);
            onCancel();
        } catch (error) {
            setSubmissionError(error instanceof Error ? error.message : "Failed to reserve room");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div
            className="app-modal-overlay fixed inset-0 z-30 flex items-start justify-center overflow-y-auto p-3 sm:p-6 scrollbar-none"
            role="presentation"
        >
            <div
                className="app-modal my-auto w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain sm:max-h-[calc(100dvh-3rem)] scrollbar-none"
                role="dialog"
                aria-modal="true"
                aria-labelledby="allocate-room-title"
            >
                <RoomReservationForm
                    onSubmit={onSubmitAllocation}
                    room={room}
                    hourlyRate={hourlyRate}
                />

                {submissionError && (
                    <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
                        {submissionError}
                    </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                    <Button
                        text="Cancel"
                        onClick={onCancel}
                    />

                    <button
                        type="submit"
                        form="room-reservation-form"
                        disabled={isSubmitting}
                        className="app-button border-[#AB784D] bg-[#F3D5A3] font-semibold text-[#1E1E1E] hover:bg-[#D4AF7A] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#B38A5E] dark:bg-[#D4AF7A] dark:text-[#1E1E1E] dark:hover:bg-[#F3D5A3]"
                    >
                        {isSubmitting ? "Confirming..." : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
}


function RoomReservationForm({ onSubmit, room, hourlyRate }) {
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [idNumber, setIdNumber] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState("");
    const [checkInDate, setCheckInDate] = useState("");
    const [period, setPeriod] = useState("1");
    const [periodUnit, setPeriodUnit] = useState("hours");
    const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
    const totalFees = calculateTotalFees(hourlyRate, period, periodUnit);

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit({
            roomNumber: room,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            idNumber: idNumber.trim(),
            phoneNumber: phoneNumber.trim(),
            email: email.trim() || undefined,
            checkInDate,
            period: Number(period),
            periodUnit,
            paidAmount: isPartialPayment ? Number(partialPaymentAmount) : undefined,
        });
    }

    return (
        <form id="room-reservation-form" onSubmit={handleSubmit} className="mt-4 ">
            <h1 className="app-accent-title">Room Reservation Form</h1>
            <p className="app-accent-title text-sm">
                Reservation for room {room}
            </p>
            <fieldset className="flex flex-row gap-4 w-full min-w-0 mt-6">
                <fieldset className="flex flex-col gap-1 w-full min-w-0">
                    <legend className="app-accent-label ">Guest First Name</legend>
                    <input type="text" name="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} required className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" placeholder="Guest first name" />
                </fieldset>
                <fieldset className="flex flex-col gap-1 w-full min-w-0">
                    <legend className="app-accent-label ">Guest Last Name</legend>
                    <input type="text" name="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} required className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" placeholder="Guest last name" />
                </fieldset>
            </fieldset>
            <fieldset className="flex flex-row gap-4 w-full min-w-0 mt-8">
                <fieldset className="flex flex-col gap-1 w-full min-w-0">
                    <legend className="app-accent-label">ID Number / Passport</legend>
                    <input type="text" name="idNumber" value={idNumber} onChange={(event) => setIdNumber(event.target.value)} required className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white " placeholder="Passport or ID Number" />
                </fieldset>
                <fieldset className="flex flex-col gap-1 w-full min-w-0">
                    <legend className="app-accent-label">Phone Number</legend>
                    <input type="tel" name="phoneNumber" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} required className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" placeholder="Phone number" />
                </fieldset>
            </fieldset>
            <fieldset className="flex flex-col gap-1 w-full min-w-0 mt-8">
                <legend className="app-accent-label">Email (optional)</legend>
                <input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" placeholder="Email address" />
            </fieldset>
            <fieldset className="flex flex-row gap-4 w-full min-w-0 mt-8">
                <fieldset className="flex flex-col gap-1 w-full min-w-0">
                    <legend className="app-accent-label">Check-in Date and Time</legend>
                    <input type="datetime-local" name="checkInDate" value={checkInDate} onChange={(event) => setCheckInDate(event.target.value)} required className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" />
                </fieldset>
                <fieldset className="flex flex-row gap-4 w-full min-w-0">
                    <fieldset className="flex flex-col gap-1 w-full min-w-0">
                        <legend className="app-accent-label">Period </legend>
                        <input type="number" name="period" min="1" step="1" inputMode="numeric" value={period} onChange={(event) => setPeriod(event.target.value)} required className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" />
                    </fieldset>
                    <fieldset className="flex flex-col gap-1 w-full min-w-0">
                        <legend className="app-accent-label">Period </legend>
                        <select name="periodUnit" value={periodUnit} onChange={(event) => setPeriodUnit(event.target.value)} className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white">
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                        </select>
                    </fieldset>
                </fieldset>
            </fieldset>


            <fieldset className="mt-8 flex w-full min-w-0 flex-col gap-3">
                <legend className="app-accent-label mb-2">
                    Payment Type
                </legend>

                <fieldset className="flex flex-row gap-4 w-full min-w-0">
                    <label className="app-accent-label flex items-center gap-2">
                        <input
                            type="radio"
                            name="paymentType"
                            value="FULL"
                            checked={!isPartialPayment}
                            onChange={() => setIsPartialPayment(false)}
                            className="accent-[#D4AF7A] dark:accent-[#B38A5E]"
                        />
                        Full Payment
                    </label>

                    <label className="app-accent-label flex items-center gap-2">
                        <input
                            type="radio"
                            name="paymentType"
                            value="PARTIAL"
                            checked={isPartialPayment}
                            onChange={() => setIsPartialPayment(true)}
                            className="accent-[#D4AF7A] dark:accent-[#B38A5E]"
                        />
                        Partial Payment
                    </label>
                </fieldset>

                {isPartialPayment && (
                    <fieldset className="mt-2 flex w-full min-w-0 flex-col gap-1">
                        <legend className="app-accent-label mb-2">
                            Partial Payment Amount
                        </legend>

                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            name="partialPaymentAmount"
                            value={partialPaymentAmount}
                            onChange={(event) => setPartialPaymentAmount(event.target.value)}
                            className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white"
                            placeholder="Enter partial paid amount"
                            required
                        />
                    </fieldset>
                )}
            </fieldset>


            <fieldset className="flex flex-col gap-1 w-full min-w-0 mt-8">
                <legend className="app-accent-label">Total fees</legend>
                <input
                    type="text"
                    name="totalFees"
                    value={totalFees === null ? "0.00" : totalFees.toFixed(2)}
                    readOnly
                    className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white"
                    placeholder="Rate unavailable"
                />
            </fieldset>
        </form>
    )
}