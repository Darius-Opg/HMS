import {  useState } from "react";
import Button from "../Button";

export function HardActionForm({
    onSubmit,
    onClose,
    title,
    btnText,
    userName,
    isSubmitting = false,
}) {
    const [reason, setReason] = useState("");

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit(reason.trim());
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1 text-center">
                <h1 className="app-accent-title">{title}</h1>
                <p className="app-muted-text text-sm">{userName}</p>
            </div>
            <fieldset className="flex flex-col gap-2" disabled={isSubmitting}>
                <label htmlFor="user-action-reason" className="app-accent-label">
                    Reason for {title.toLocaleLowerCase()}
                </label>
                <textarea
                    className="app-input min-h-24 w-full resize-none"
                    name="reason"
                    id="user-action-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    required
                />
            </fieldset>
            <div className="flex justify-end gap-2">
                <Button text="Cancel" onClick={onClose} disabled={isSubmitting} />
                <button
                    type="submit"
                    disabled={!reason.trim() || isSubmitting}
                    className="app-button-primary"
                >
                    {isSubmitting ? "Saving..." : btnText}
                </button>
            </div>
        </form>
    );
}

export function PromoteOrDemoteConfirmation({
    onClose,
    onSubmit,
    title,
    btnText,
    actionType,
    isSubmitting = false,
}) {
    return (
        <div className="space-y-5 text-center">
            <h1 className="app-accent-title">{title}</h1>
            <p className="app-muted-text text-sm">
                Are you sure you want to {actionType} this user?
            </p>
            <div className="flex justify-center gap-2">
                <Button text="Cancel" onClick={onClose} disabled={isSubmitting} />
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="app-button-primary"
                >
                    {isSubmitting ? "Saving..." : btnText}
                </button>
            </div>
        </div>
    );
}



export function EditDetails({ onClose, onSubmit, user, isSubmitting = false }) {
    const [name, setName] = useState(user?.name ?? "");
    const [email, setEmail] = useState(user?.email ?? "");
    const [idNumber, setIdNumber] = useState(user?.idNumber ?? "");
    const [phone, setPhone] = useState(user?.phone ?? "");

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit({
            name: name.trim(),
            email: email.trim(),
            idNumber: idNumber.trim(),
            phone: phone.trim(),
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1 text-center">
                <h1 className="app-accent-title">Edit User Details</h1>
                <p className="app-muted-text text-sm">{user?.name}</p>
            </div>
            <fieldset className="flex flex-col gap-4" disabled={isSubmitting}>
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="edit-user-name" className="app-accent-label">Full name</label>
                    <input
                        id="edit-user-name"
                        name="name"
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        autoComplete="name"
                        required
                        className="app-input h-10 w-full"
                    />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="edit-user-email" className="app-accent-label">Email</label>
                    <input
                        id="edit-user-email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        required
                        className="app-input h-10 w-full"
                    />
                </div>
                <fieldset className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-1">
                        <label htmlFor="edit-user-id-number" className="app-accent-label">ID number / passport</label>
                        <input
                            id="edit-user-id-number"
                            name="idNumber"
                            type="text"
                            value={idNumber}
                            onChange={(event) => setIdNumber(event.target.value)}
                            required
                            className="app-input h-10 w-full"
                        />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                        <label htmlFor="edit-user-phone" className="app-accent-label">Phone number</label>
                        <input
                            id="edit-user-phone"
                            name="phone"
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            autoComplete="tel"
                            required
                            className="app-input h-10 w-full"
                        />
                    </div>
                </fieldset>
            </fieldset>
            <div className="flex justify-end gap-2">
                <Button text="Cancel" onClick={onClose} disabled={isSubmitting} />
                <button type="submit" disabled={isSubmitting} className="app-button-primary">
                    {isSubmitting ? "Saving..." : "Save"}
                </button>
            </div>
        </form>
    );
}


const AVAILABLE_PERMISSIONS = [
    { value: "MANAGE_ROOMS", label: "Manage rooms" },
    { value: "MANAGE_RESERVATIONS", label: "Manage reservations" },
    { value: "MANAGE_GUESTS", label: "Manage guests" },
    { value: "MANAGE_BILLING", label: "Manage billing" },
    { value: "VIEW_REPORTS", label: "View reports" },
    { value: "MANAGE_USERS", label: "Manage users" },
    { value: "VIEW_AUDIT_LOG", label: "View audit log" },
];


export function PermissionForm({
    onClose,
    onSubmit,
    user,
    isSubmitting = false,
}) {
    const [draft, setDraft] = useState(null);

    const permissions = draft ?? user?.permissions ?? [];

    function togglePermission(permission) {
        setDraft((current) => {
            const base = current ?? user?.permissions ?? [];
            return base.includes(permission)
                ? base.filter((item) => item !== permission)
                : [...base, permission];
        });
    }

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit(permissions);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1 text-center">
                <h1 className="app-accent-title">
                    Manage Permissions
                </h1>

                <p className="app-muted-text text-sm">
                    {user?.name}
                </p>
            </div>

            <fieldset
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                disabled={isSubmitting}
            >
                <legend className="app-accent-label mb-3">
                    User permissions
                </legend>

                {AVAILABLE_PERMISSIONS.map(({ value, label }) => (
                    <label
                        key={value}
                        className="app-card flex cursor-pointer items-center gap-3 p-3 text-sm"
                    >
                        <input
                            type="checkbox"
                            name="permissions"
                            value={value}
                            checked={permissions.includes(value)}
                            onChange={() => togglePermission(value)}
                            className="size-4 accent-[#AB784D]"
                        />

                        <span className="app-accent-label">{label}</span>
                    </label>
                ))}
            </fieldset>

            <div className="flex justify-end gap-2">
                <Button
                    text="Cancel"
                    onClick={onClose}
                    disabled={isSubmitting}
                />

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="app-button-primary"
                >
                    {isSubmitting
                        ? "Saving..."
                        : "Save permissions"}
                </button>
            </div>
        </form>
    );
}