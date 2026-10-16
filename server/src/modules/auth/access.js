import jwt from 'jsonwebtoken';

export const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;

if (!ACCESS_TOKEN_SECRET) {
    throw new Error('JWT_ACCESS_SECRET must be set');
}

export function requireAuth(req, res, next) {
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null;
    const token = headerToken || req.cookies?.accessToken;

    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    try {
        const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
        req.user = { id: payload.sub, role: payload.role, permissions: payload.permissions };
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

export function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user?.permissions?.includes(permission)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}