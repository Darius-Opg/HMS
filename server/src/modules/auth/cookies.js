
const ACCESS_TOKEN_TTL_MINUTES = Number(process.env.JWT_ACCESS_TTL_MINUTES || 15);
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax;'
}

export function setAuthCookies(res, accessToken, refreshToken) {
    res
        .cookie('accessToken', accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
        })
        .cookie('refreshToken', refreshToken, {
            ...COOKIE_OPTIONS,
            path: '/auth',
            maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        });
}

export function clearAuthCookies(res) {
    res.clearCookie('accessToken', COOKIE_OPTIONS).clearCookie('refreshToken', { ...COOKIE_OPTIONS, path: '/auth' });
}