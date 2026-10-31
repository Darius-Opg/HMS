import { logError } from '../audit/logActivity.js';


const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const BLOCKING_RESERVATION_STATUSES = ['BOOKED', 'CHECKED_IN'];

export function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

export function assertUuid(value, field) {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
        throw httpError(400, `${field} is not a valid id`);
    }
}

export function positiveNumber(value, field) {
    const usable = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
    if (!usable || !Number.isFinite(Number(value)) || Number(value) <= 0) {
        throw httpError(400, `${field} must be a number greater than 0`);
    }
    return value;
}

export function parseDate(value, field) {
    const date = value instanceof Date ? value : new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
        throw httpError(400, `${field} must be a valid date (e.g. 2026-11-01)`);
    }
    return date;
}

export function withLogging(name, fn) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            logError(name, error);
            throw error;
        }
    };
}
