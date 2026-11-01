import { apiFetch } from "./api";

async function readResponse(response, fallbackMessage) {
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || fallbackMessage);
    }
    return data;
}

export async function listUsers() {
    const response = await apiFetch("/users");
    const users = await readResponse(response, "Could not load users.");
    if (!Array.isArray(users)) {
        throw new Error("The users response was not a list.");
    }
    return users;
}

export async function registerNewUser({ name, idNumber, email, role, phone, password }) {
    const res = await apiFetch('/users', {
        method: "POST",
        body: JSON.stringify({
            name, phone,
            email, role,
            idNumber, password
        })
    });
    return readResponse(res, "Failed to register new user.");
}

export async function deactivateUser(userId, reason) {
    const response = await apiFetch(`/users/${encodeURIComponent(userId)}/deactivate`, {
        method: "POST",
        body: JSON.stringify({ reason }),
    });
    return readResponse(response, "Could not deactivate user.");
}

export async function activateUser(userId) {
    const response = await apiFetch(`/users/${encodeURIComponent(userId)}/reactivate`, {
        method: "POST",
    });
    return readResponse(response, "Could not activate user.");
}

export async function deleteUser(userId, reason) {
    const response = await apiFetch(`/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        body: JSON.stringify({ reason }),
    });
    return readResponse(response, "Could not delete user.");
}

export async function updateUser(userId, updates) {
    const response = await apiFetch(`/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
    });
    return readResponse(response, "Could not update user.");
}

export async function sendPasswordResetLink(userId) {
    const response = await apiFetch(`/users/${encodeURIComponent(userId)}/reset-password`, {
        method: "POST",
    });
    return readResponse(response, "Could not send password reset link.");
}

export async function resetPasswordWithToken({ token, password }) {
    const response = await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
    });
    return readResponse(response, "Could not reset password.");
}
