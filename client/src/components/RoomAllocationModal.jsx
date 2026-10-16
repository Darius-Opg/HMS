import { useState } from "react";
import Button from "./Button";

export default function RoomAllocationModal({ room, onCancel }) {

    async function onSubmitAllocation() {
        //this function will handle room allocation api 
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
                    onsubmit={onSubmitAllocation}
                    room={room}
                />

                <div className="mt-6 flex justify-end gap-2">
                    <Button
                        text="Cancel"
                        onClick={onCancel}
                    />

                    <Button
                        text="Confirm"
                        onClick={onSubmitAllocation}
                        className="border-[#AB784D] bg-[#F3D5A3] font-semibold text-[#1E1E1E] hover:bg-[#D4AF7A] dark:border-[#B38A5E] dark:bg-[#D4AF7A] dark:text-[#1E1E1E] dark:hover:bg-[#F3D5A3]"
                    />
                </div>
            </div>
        </div>
    );
}


function RoomReservationForm({ onsubmit, room }) {
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    return (
        <form onSubmit={onsubmit} className="mt-4 ">
            <h1 className="app-accent-title">Room Reservation Form</h1>
            <p className="app-accent-title text-sm">
                Reservation for room {room}
            </p>
            <fieldset className="flex flex-row gap-4 w-full min-w-0 mt-6">
                <fieldset className="flex flex-col gap-1 w-full min-w-0">
                    <legend className="app-accent-label ">Guest First Name</legend>
                    <input type="text" className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" placeholder="Guest first name" />
                </fieldset>
                <fieldset className="flex flex-col gap-1 w-full min-w-0">
                    <legend className="app-accent-label ">Guest Last Name</legend>
                    <input type="text" className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" placeholder="Guest last name" />
                </fieldset>
            </fieldset>
            <fieldset className="flex flex-row gap-4 w-full min-w-0 mt-8">
                <fieldset className="flex flex-col gap-1 w-full min-w-0">
                    <legend className="app-accent-label">ID Number / Passport</legend>
                    <input type="text" className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white " placeholder="Passport or ID Number" />
                </fieldset>
                <fieldset className="flex flex-col gap-1 w-full min-w-0">
                    <legend className="app-accent-label">Phone Number</legend>
                    <input type="tel" className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" placeholder="Phone number" />
                </fieldset>
            </fieldset>
            <fieldset className="flex flex-col gap-1 w-full min-w-0 mt-8">
                <legend className="app-accent-label">Email (optional)</legend>
                <input type="email" className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" placeholder="Email address" />
            </fieldset>
            <fieldset className="flex flex-row gap-4 w-full min-w-0 mt-8">
                <fieldset className="flex flex-col gap-1 w-full min-w-0">
                    <legend className="app-accent-label">Check-in Date and Time</legend>
                    <input type="datetime-local" className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" />
                </fieldset>
                <fieldset className="flex flex-row gap-4 w-full min-w-0">
                    <fieldset className="flex flex-col gap-1 w-full min-w-0">
                        <legend className="app-accent-label">Period </legend>
                        <input type="number" inputMode="numerical" className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" />
                    </fieldset>
                    <fieldset className="flex flex-col gap-1 w-full min-w-0">
                        <legend className="app-accent-label">Period </legend>
                        <select className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white">
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
                            className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white"
                            placeholder="Enter partial paid amount"
                            required
                        />
                    </fieldset>
                )}
            </fieldset>


            <fieldset className="flex flex-col gap-1 w-full min-w-0 mt-8">
                <legend className="app-accent-label">Total fees</legend>
                <input readOnly className="app-input h-10 w-full rounded-md bg-[#dbdad9] pl-3 text-black outline-none dark:bg-slate-600 dark:text-white" placeholder="Total fees" />
            </fieldset>
        </form>
    )
}