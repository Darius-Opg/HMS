
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, refreshSession, setAccessToken, setAuthFailureHandler } from '../lib/api';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setAuthFailureHandler(() => {
            setAccessToken(null);
            setUser(null);
        });

        let active = true;
        refreshSession().then((data) => {
            if (!active) return;
            setUser(data ? data.user : null);
            setLoading(false);
        });
        return () => {
            active = false;
        };
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const error = new Error(data.error || 'Login failed');
            error.status = res.status;
            throw error;
        }

        setAccessToken(data.accessToken);
        setUser(data.user);
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiFetch('/auth/logout', { method: 'POST' });
        } finally {
            setAccessToken(null);
            setUser(null);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}