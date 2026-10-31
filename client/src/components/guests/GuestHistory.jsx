import { useEffect, useState } from "react";
import { getGuestHistory } from "../../lib/guestApi.js";

function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatAction(action = "Activity") {
    return action
        .toLocaleLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
        .join(" ");
}

function formatMetadata(metadata = {}) {
    const ignoredKeys = new Set(["reservationId"]);
    return Object.entries(metadata ?? {})
        .filter(([key, value]) => !ignoredKeys.has(key) && value !== null && value !== undefined && value !== "")
        .map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toLocaleUpperCase());
            if (/date|checkin|checkout/i.test(key)) return `${label}: ${formatDateTime(value)}`;
            if (["amountPaid", "totalAmount"].includes(key)) {
                return `${label}: ${new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(Number(value))}`;
            }
            return `${label}: ${String(value)}`;
        });
}

export default function GuestHistory({ guestId, guestName }) {
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError("");
        getGuestHistory(guestId)
            .then((data) => {
                if (!cancelled) setActivities(data);
            })
            .catch((loadError) => {
                if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load guest activity history.");
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [guestId]);

    return (
        <article aria-label={`Activity history of ${guestName}`} data-guest-id={guestId} className="space-y-5">
            <div className="relative border-b border-[#AB784D]/20 pb-4 pr-12 dark:border-[#B38A5E]/20">
                <p className="app-accent-label">Guest activity</p>
                <h2 className="app-accent-title mt-1 text-xl font-semibold">History of {guestName}</h2>
            </div>

            {isLoading && <p className="app-card app-muted-text p-5 text-sm" role="status">Loading guest activity…</p>}
            {error && <p className="app-error text-sm" role="alert">{error}</p>}
            {!isLoading && !error && activities.length === 0 && (
                <div className="app-card app-muted-text p-5 text-sm" role="status">No recorded activity for this guest yet.</div>
            )}
            {!isLoading && !error && activities.length > 0 && (
                <ol className="max-h-[60vh] space-y-3 overflow-y-auto">
                    {activities.map((activity) => {
                        const details = formatMetadata(activity.metadata);
                        return (
                            <li key={activity.id} className="app-card space-y-2 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{formatAction(activity.action)}</h3>
                                    <time className="app-muted-text text-xs" dateTime={activity.createdAt}>{formatDateTime(activity.createdAt)}</time>
                                </div>
                                {details.length > 0 && <p className="app-muted-text text-sm">{details.join(" · ")}</p>}
                                {activity.performedBy?.name && <p className="app-muted-text text-xs">Recorded by {activity.performedBy.name}</p>}
                            </li>
                        );
                    })}
                </ol>
            )}
        </article>
    );
}
