// client/src/lib/api.js
//
// Thin fetch wrapper. The access token lives in a module variable
// (in memory only, never localStorage) and is sent two ways on every
// request: as an Authorization header AND via the accessToken cookie
// (credentials: 'include'). The backend checks the header first and
// falls back to the cookie.
//
// On a 401 from a non-/auth/ endpoint it tries ONE silent refresh and
// retries the original request once.

const API_URL = import.meta.env.VITE_API_URL;

let accessToken = null;
let onAuthFailure = null;
let refreshPromise = null;

export function setAccessToken(token) {
    accessToken = token;
}

export function setAuthFailureHandler(handler) {
    onAuthFailure = handler;
}

export function send(path, options = {}) {
    const headers = { ...options.headers };
    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }
    return fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' });
}

// Single-flight: concurrent callers share one in-flight refresh.
// This is required, not just an optimization. The backend rotates
// refresh tokens and treats reuse of an already-rotated token as theft
// (it revokes every session for that user), so two simultaneous
// refreshes would log you out. React StrictMode in dev triggers exactly
// that by running effects twice.
export function refreshSession() {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                const res = await send('/auth/refresh', { method: 'POST' });
                if (!res.ok) return null;
                const data = await res.json();
                accessToken = data.accessToken;
                return data; // { accessToken, user }
            } catch {
                return null;
            } finally {
                refreshPromise = null;
            }
        })();
    }
    return refreshPromise;
}

export async function apiFetch(path, options = {}) {
    let res = await send(path, options);

    if (res.status === 401 && !path.startsWith('/auth/')) {
        const refreshed = await refreshSession();
        if (refreshed) {
            res = await send(path, options);
        } else {
            onAuthFailure?.();
        }
    }
    return res;
}