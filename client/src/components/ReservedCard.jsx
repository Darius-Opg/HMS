
import { useEffect, useState } from "react";
import Button from "./Button";
import {
    UserRound,
    BedDouble,
    CreditCard,
    CircleCheck,
    CircleAlert,
    Coins,
    Clock3,
} from "lucide-react";

export default function GuestReservationCard({
    guestName,
    roomNumber,
    paymentStatus,
    isOverdue,
    amountPaid,
    balance,
    checkOutDate,
    reservationStatus,
    extraTimeStayedMinutes = 0,
    onUpdate,
    onCheckIn,
    onCheckOut,
}) {
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    const formatCurrency = (amount) =>
        new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: "KES",
            minimumFractionDigits: 2,
        }).format(Number(amount ?? 0));

    function formatExtraTimeStayed(totalMinutes) {
        const minutes = Number(totalMinutes);
        if (!Number.isFinite(minutes) || minutes <= 0) return "—";

        const days = Math.floor(minutes / (24 * 60));
        const hours = Math.floor((minutes % (24 * 60)) / 60);
        const remainingMinutes = minutes % 60;
        const duration = [];

        if (days) duration.push(`${days}d`);
        if (hours) duration.push(`${hours}h`);
        if (remainingMinutes || duration.length === 0) duration.push(`${remainingMinutes}m`);

        return duration.join(" ");
    }

    function getTimeToCheckOut() {
        if (!checkOutDate) return "Not available";

        const checkOutTime = new Date(checkOutDate).getTime();
        if (!Number.isFinite(checkOutTime)) return "Not available";

        const difference = checkOutTime - currentTime;
        if (difference <= 0) return "Time to check out has passed";

        const totalMinutes = Math.ceil(difference / 60_000);
        const days = Math.floor(totalMinutes / (24 * 60));
        const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
        const minutes = totalMinutes % 60;
        const remaining = [];

        if (days) remaining.push(`${days}d`);
        if (hours) remaining.push(`${hours}h`);
        if (minutes || remaining.length === 0) remaining.push(`${minutes}m`);

        return remaining.join(" ");
    }

    return (
        <article className="app-card app-card-raised overflow-hidden text-gray-900 dark:bg-[#161616] dark:text-white">
            {/* Guest and room information */}
            <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2 sm:p-6">
                <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#D4AF7A]/15 text-[#AB784D] dark:text-[#D4AF7A]">
                        <UserRound size={28} />
                    </div>

                    <div className="min-w-0">
                        <p className="app-accent-label">Guest Name</p>
                        <h2 className="mt-1 wrap-break-words text-lg font-semibold">
                            {guestName || "Unknown Guest"}
                        </h2>
                    </div>
                </div>

                <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#D4AF7A]/15 text-[#AB784D] dark:text-[#D4AF7A]">
                        <BedDouble size={28} />
                    </div>

                    <div>
                        <p className="app-accent-label">Room Number</p>
                        <p className="mt-1 text-lg font-semibold">
                            {roomNumber ?? "—"}
                        </p>
                    </div>
                </div>

                {/* Payment and check-out details */}
                <div className="flex flex-wrap gap-x-8 gap-y-4 sm:col-span-2">
                    <div>
                        <p className="app-accent-label mb-2">
                            Payment Status
                        </p>

                        <span className="inline-flex items-center gap-2 rounded-full bg-[#F3D5A3] px-4 py-2 text-sm font-semibold text-[#1E1E1E]">
                            <CreditCard size={18} />
                            {paymentStatus || "Unknown"}
                        </span>
                    </div>

                    <div>
                        <p className="app-accent-label mb-2">Overdue?</p>

                        <span
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${isOverdue
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                }`}
                        >
                            {isOverdue ? (
                                <CircleAlert size={18} />
                            ) : (
                                <CircleCheck size={18} />
                            )}

                            {isOverdue ? "Yes" : "No"}
                        </span>
                    </div>

                    <div>
                        <p className="app-accent-label mb-2">Amount Paid</p>
                        <p className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold">
                            <Coins aria-hidden="true" size={18} className="text-[#AB784D] dark:text-[#D4AF7A]" />
                            {formatCurrency(amountPaid)}
                        </p>
                    </div>

                    <div>
                        <p className="app-accent-label mb-2">Time to Check Out</p>
                        <p className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold">
                            <Clock3 aria-hidden="true" size={18} className="text-[#AB784D] dark:text-[#D4AF7A]" />
                            {getTimeToCheckOut()}
                        </p>
                    </div>

                    <div>
                        <p className="app-accent-label mb-2">Extra Time Stayed</p>
                        <p className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold">
                            <Clock3 aria-hidden="true" size={18} className="text-[#AB784D] dark:text-[#D4AF7A]" />
                            {formatExtraTimeStayed(extraTimeStayedMinutes)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Balance and actions */}
            <div className="flex flex-col gap-5 border-t border-[#AB784D]/25 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#D4AF7A]/15 text-[#AB784D] dark:text-[#D4AF7A]">
                        <Coins size={28} />
                    </div>

                    <div>
                        <p className="app-accent-label">Balance</p>
                        <p className="mt-1 text-2xl font-bold">
                            {formatCurrency(balance)}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    {reservationStatus === "BOOKED" && (
                        <Button
                            text="Check In"
                            onClick={onCheckIn}
                            className="w-full sm:w-auto text-sm "
                        />
                    )}
                    <Button
                        text="Update"
                        onClick={onUpdate}
                        className="w-full sm:w-auto text-sm"
                    />
                    <Button
                        text="Check Out"
                        onClick={onCheckOut}
                        className="w-full sm:w-auto text-sm"
                    />
                </div>
            </div>
        </article>
    );
}
