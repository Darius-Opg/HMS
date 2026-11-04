import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const PERMISSIONS = [
    ["MANAGE_ROOMS", "Manage rooms"],
    ["MANAGE_RESERVATIONS", "Manage reservations"],
    ["MANAGE_GUESTS", "Manage guests"],
    ["MANAGE_BILLING", "Manage billing"],
    ["VIEW_REPORTS", "View reports"],
    ["MANAGE_USERS", "Manage users"],
    ["VIEW_AUDIT_LOG", "View audit log"],
];

function formatDate(value, includeTime = false) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, includeTime
        ? { dateStyle: "medium", timeStyle: "short" }
        : { dateStyle: "medium" }).format(date);
}

export default function UserDetailsModal({ user, onClose, onViewAudit }) {
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);

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

    const grantedPermissions = Array.isArray(user.permissions) ? user.permissions : [];
    const permissionLabels = new Map(PERMISSIONS);
    const permissionEntries = grantedPermissions.map((permission) => [
        permission,
        permissionLabels.get(permission) ?? permission,
    ]);
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
            className="app-modal-overlay fixed inset-0 z-30 flex items-start justify-center overflow-y-auto p-3 scrollbar-none sm:p-6"
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
                className="app-modal relative my-auto mt-8 max-h-[calc(100dvh-3.5rem)] w-full max-w-3xl overflow-y-auto scrollbar-none p-5 sm:mt-10 sm:max-h-[calc(100dvh-4rem)] sm:p-8"
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
                        {permissionEntries.map(([permission, label]) => (
                            <li key={permission} className="app-card p-3 text-sm">
                                {label}
                            </li>
                        ))}
                        {permissionEntries.length === 0 && (
                            <li className="app-muted-text text-sm">No permissions assigned.</li>
                        )}
                    </ul>
                </section>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={() => onViewAudit(user)}
                        className="app-button min-h-10"
                    >
                        View audit log actions
                    </button>
                </div>
            </section>
        </div>
    );
}
