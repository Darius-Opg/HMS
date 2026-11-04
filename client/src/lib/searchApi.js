import { apiFetch } from './api.js';

const CACHE_PREFIX = 'search-results:v4';
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(user, query) {
    const permissions = [...(user.permissions ?? [])].sort().join(',');
    const userScope = `${user.id}:${user.role}:${permissions}`;
    return `${CACHE_PREFIX}:${encodeURIComponent(userScope)}:${encodeURIComponent(query.toLocaleLowerCase())}`;
}

function readCachedResults(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;

        try {
            const cached = JSON.parse(raw);
            if (
                cached
                && Number.isFinite(cached.expiresAt)
                && cached.expiresAt > Date.now()
                && Array.isArray(cached.results)
            ) {
                return cached.results;
            }
        } catch (error) {
            console.warn('Could not parse cached search results; removing the invalid cache entry.', error);
        }

        sessionStorage.removeItem(key);
    } catch (error) {
        console.warn('Search result cache is unavailable in this browser session.', error);
    }
    return null;
}

function cacheResults(key, results) {
    try {
        sessionStorage.setItem(key, JSON.stringify({
            expiresAt: Date.now() + CACHE_TTL_MS,
            results,
        }));
    } catch (error) {
        console.warn('Could not cache search results for this browser session.', error);
    }
}

export async function searchRecords(query, user) {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return [];
    if (!user?.id) throw new Error('A signed-in user is required to search.');

    const key = cacheKey(user, normalizedQuery);
    const cachedResults = readCachedResults(key);
    if (cachedResults) return cachedResults;

    const params = new URLSearchParams({ q: normalizedQuery });
    const response = await apiFetch(`/search?${params}`);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.error || 'Could not search records.');
    }
    if (!Array.isArray(data)) {
        throw new Error('The search response was not a list.');
    }

    cacheResults(key, data);
    return data;
}
