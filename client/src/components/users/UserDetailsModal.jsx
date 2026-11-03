import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getUserHistory } from "../../lib/usersApi";

const PERMISSIONS = [
    ["MANAGE_ROOMS", "Manage rooms"],
    ["MANAGE_RESERVATIONS", "Manage reservations"],
    ["MANAGE_GUESTS", "Manage guests"],
    ["MANAGE_BILLING", "Manage billing"],
    ["VIEW_REPORTS", "View reports"],
    ["MANAGE_USERS", "Manage users"],
    ["VIEW_AUDIT_LOG", "View audit log"],
];

const PERSONAL_FIELDS = {
    name: "Name",
    email: "Email",
    phone: "Phone number",
    idNumber: "ID number / passport",
};

function formatDate(value, includeTime = false) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, includeTime
        ? { dateStyle: "medium", timeStyle: "short" }
        : { dateStyle: "medium" }).format(date);
}

function getHistoryDetails(entry) {
    const changedFields = entry.metadata?.changedFields;
    if (Array.isArray(changedFields)) {
        return changedFields.length
            ? `Updated: ${changedFields.map((field) => PERSONAL_FIELDS[field] ?? field).join(", ")}`
            : "No personal-data fields changed.";
    }
    return entry.action === "USER_CREATED"
        ? "Account created; personal data was not historically tracked."
        : "Personal-data changes were not tracked for this older update.";
}

export default function UserDetailsModal({ user, onClose, onViewAudit }) {
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);
    const [history, setHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState("");

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        closeButtonRef.current?.focus();

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key !== "Tab" || !dialogRef.current) return;

            const focusable = [...dialogRef.current.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
            )];
            if (!focusable.length) {
                event.preventDefault();
                dialogRef.current.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            previouslyFocused?.focus?.();
        };
    }, [onClose]);

    useEffect(() => {
        let cancelled = false;
        getUserHistory(user.id)
            .then((entries) => {
                if (!cancelled) setHistory(entries);
            })
            .catch((error) => {
                if (!cancelled) {
                    setHistoryError(error instanceof Error ? error.message : "Could not load user activity.");
                }
            })
            .finally(() => {
                if (!cancelled) setIsLoadingHistory(false);
            });
        return () => {
            cancelled = true;
        };
    }, [user.id]);

    const grantedPermissions = Array.isArray(user.permissions) ? user.permissions : [];
    const knownPermissions = new Set(PERMISSIONS.map(([permission]) => permission));
    const permissionEntries = [
        ...PERMISSIONS,
        ...grantedPermissions
            .filter((permission) => !knownPermissions.has(permission))
            .map((permission) => [permission, permission]),
    ];
    const details = [
        ["Full name", user.name],
        ["Email", user.email],
        ["Phone number", user.phone],
        ["ID number / passport", user.idNumber],
        ["Role", user.role],
        ["Status", user.isActive ? "Active" : "Inactive"],
        ["Date joined", formatDate(user.createdAt)],
    ];

    return (
        <div
            className="app-modal-overlay fixed inset-0 z-30 flex items-start justify-center overflow-y-auto p-3 sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-details-heading"
                tabIndex={-1}
                className="app-modal relative my-auto mt-8 max-h-[calc(100dvh-3.5rem)] w-full max-w-3xl overflow-y-auto p-5 sm:mt-10 sm:max-h-[calc(100dvh-4rem)] sm:p-8"
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    className="app-button absolute right-4 top-4 inline-flex size-9 items-center justify-center p-0"
                    aria-label="Close user details"
                >
                    <X aria-hidden="true" size={18} />
                </button>
                <header className="mb-6 pr-10">
                    <h2 id="user-details-heading" className="app-accent-title text-left text-2xl">User details</h2>
                    <p className="app-muted-text mt-1 text-sm">{user.name || user.email}</p>
                </header>

                <section aria-labelledby="user-personal-details-heading">
                    <h3 id="user-personal-details-heading" className="mb-3 font-semibold">Personal details</h3>
                    <dl className="grid gap-3 sm:grid-cols-2">
                        {details.map(([label, value]) => (
                            <div key={label} className="app-card min-w-0 p-3">
                                <dt className="app-accent-label">{label}</dt>
                                <dd className="mt-1 break-words text-sm">{value || "—"}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <section className="mt-6" aria-labelledby="user-permissions-heading">
                    <h3 id="user-permissions-heading" className="mb-3 font-semibold">Permissions</h3>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {permissionEntries.map(([permission, label]) => {
                            const granted = grantedPermissions.includes(permission);
                            return (
                                <li key={permission} className="app-card flex items-center justify-between gap-3 p-3 text-sm">
                                    <span>{label}</span>
                                    <span className={granted ? "text-emerald-700 dark:text-emerald-300" : "app-muted-text"}>
                                        {granted ? "Granted" : "Not granted"}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <section className="mt-6" aria-labelledby="user-history-heading">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <h3 id="user-history-heading" className="font-semibold">Personal-data activity</h3>
                        <button
                            type="button"
                            onClick={() => onViewAudit(user)}
                            className="app-button min-h-10"
                        >
                            View audit log actions
                        </button>
                    </div>
                    <p className="app-muted-text mb-3 text-xs">
                        Activity records show field names when available; previous and new personal-data values are not stored in the audit log.
                    </p>
                    {isLoadingHistory && <p className="app-muted-text text-sm" role="status">Loading user activity…</p>}
                    {historyError && <p className="app-error" role="alert">{historyError}</p>}
                    {!isLoadingHistory && !historyError && history.length === 0 && (
                        <p className="app-muted-text text-sm">No user activity has been recorded.</p>
                    )}
                    {!historyError && history.length > 0 && (
                        <ol className="space-y-3">
                            {history.map((entry) => (
                                <li key={entry.id} className="app-card p-3">
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                        <span className="app-chip">{entry.action.replaceAll("_", " ")}</span>
                                        <time className="app-muted-text text-xs" dateTime={entry.createdAt}>
                                            {formatDate(entry.createdAt, true)}
                                        </time>
                                    </div>
                                    <p className="mt-2 text-sm">{getHistoryDetails(entry)}</p>
                                    <p className="app-muted-text mt-1 text-xs">Performed by {entry.performedBy}</p>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </section>
        </div>
    );
}
