
import rateLimit from 'express-rate-limit';

export function createRateLimiter({ windowMs, max, message }) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: message || 'Too many requests, please try again later.' },
    });
}

//this limits per ip 
export const globalLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300, 
});

//this limits per ip since it guards login which is publicly accessable
export const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10, 
    message: 'Too many login attempts, please try again later.',
});