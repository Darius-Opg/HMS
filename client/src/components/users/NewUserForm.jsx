import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Button from "../Button";
import { registerNewUser } from "../../lib/usersApi";

export default function NewUserForm({ onClose, onUserCreated }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [idNumber, setIdNumber] = useState("");
    const [password, setPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [role, setRole] = useState("STAFF");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionError, setSubmissionError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setIsSubmitting(true);
        setSubmissionError("");

        try {
            await registerNewUser({
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                idNumber: idNumber.trim(),
                password,
                role,
            });
            onUserCreated?.();
            onClose();
        } catch (error) {
            setSubmissionError(error instanceof Error ? error.message : "Failed to register user.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1 pr-10 text-center">
                <h1 className="app-accent-title">Register New User</h1>
            </div>

            <fieldset className="flex w-full min-w-0 flex-col gap-4" disabled={isSubmitting}>
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="new-user-name" className="app-accent-label">Full name</label>
                    <input
                        id="new-user-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                        className="app-input h-10 w-full"
                        placeholder="Full name"
                    />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="new-user-email" className="app-accent-label">Email</label>
                    <input
                        id="new-user-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        className="app-input h-10 w-full"
                        placeholder="Email address"
                    />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="new-user-phone" className="app-accent-label">Phone number</label>
                    <input
                        id="new-user-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        required
                        className="app-input h-10 w-full"
                        placeholder="Phone number"
                    />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="new-user-id-number" className="app-accent-label">ID number / passport</label>
                    <input
                        id="new-user-id-number"
                        name="idNumber"
                        type="text"
                        value={idNumber}
                        onChange={(event) => setIdNumber(event.target.value)}
                        required
                        className="app-input h-10 w-full"
                        placeholder="ID number or passport"
                    />
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="new-user-password" className="app-accent-label">Password</label>
                    <div className="relative">
                        <input
                            id="new-user-password"
                            name="password"
                            type={isPasswordVisible ? "text" : "password"}
                            autoComplete="new-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            className="app-input h-10 w-full pr-10"
                            placeholder="Set an initial password"
                        />
                        <button
                            type="button"
                            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                            aria-pressed={isPasswordVisible}
                            onClick={() => setIsPasswordVisible((visible) => !visible)}
                            className="app-muted-text absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center hover:text-current"
                        >
                            {isPasswordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                        </button>
                    </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="new-user-role" className="app-accent-label">Role</label>
                    <select
                        id="new-user-role"
                        name="role"
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        className="app-input h-10 w-full"
                    >
                        <option value="STAFF">Staff</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                </div>
            </fieldset>

            {submissionError && (
                <p className="app-error" role="alert">
                    {submissionError}
                </p>
            )}

            <div className="flex justify-end gap-2">
                <Button text="Cancel" onClick={onClose} disabled={isSubmitting} />
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="app-button-primary"
                >
                    {isSubmitting ? "Saving..." : "Save user"}
                </button>
            </div>
        </form>
    );
}
