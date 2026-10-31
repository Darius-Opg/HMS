import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPasswordWithToken } from "../lib/usersApi.js";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");
        if (!token) {
            setError("This password reset link is missing its token.");
            return;
        }
        if (password.length < 8) {
            setError("Use a password with at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("The passwords do not match.");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await resetPasswordWithToken({ token, password });
            setSuccess(result.message || "Your password has been updated.");
        } catch (resetError) {
            setError(resetError instanceof Error ? resetError.message : "Could not reset password.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="app-page flex min-h-screen items-center justify-center px-4 py-10">
            <form onSubmit={handleSubmit} className="app-card w-full max-w-md space-y-5 p-6">
                <header className="space-y-1 text-center">
                    <h1 className="app-accent-title text-2xl font-semibold">Set a new password</h1>
                    <p className="app-muted-text text-sm">Choose a password with at least 8 characters.</p>
                </header>

                {error && <p className="app-error" role="alert">{error}</p>}
                {success && <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" role="status">{success}</p>}

                {!success && (
                    <>
                        <label className="flex flex-col gap-1">
                            <span className="app-accent-label">New password</span>
                            <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="app-input h-10 w-full" />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="app-accent-label">Confirm new password</span>
                            <input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="app-input h-10 w-full" />
                        </label>
                        <button type="submit" disabled={isSubmitting || !token} className="app-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
                            {isSubmitting ? "Updating password…" : "Update password"}
                        </button>
                    </>
                )}

                <div className="text-center text-sm">
                    <Link to="/login" className="app-accent-text underline">Return to sign in</Link>
                </div>
            </form>
        </main>
    );
}
