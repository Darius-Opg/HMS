import { Prisma } from '../../generated/prisma/index.js';

const HOURS_PER_PERIOD_UNIT = {
    hours: 1,
    days: 24,
    weeks: 24 * 7,
    months: 24 * 30
}

const MS_PER_HOUR = 60 * 60 * 1000;

function roundLikeFrontend(amount) {
    if (!Number.isFinite(amount)) return null;
    const rounded = Math.round((amount + Number.EPSILON * Math.max(1, Math.abs(amount))) * 100) / 100;
    return Number.isFinite(rounded) ? new Prisma.Decimal(rounded.toFixed(2)) : null;
}

function toFiniteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    try {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    } catch {
        return null;
    }
}

function getHoursPerUnit(periodUnit) {
    return Object.hasOwn(HOURS_PER_PERIOD_UNIT, periodUnit) ? HOURS_PER_PERIOD_UNIT[periodUnit] : undefined
}

export function calculateStayDate(period, periodUnit, checkInTime) {
    const duration = toFiniteNumber(period);
    const hoursPerUnit = getHoursPerUnit(periodUnit);
    const start = new Date(checkInTime);

    if (!Number.isFinite(duration) || duration <= 0 || hoursPerUnit === undefined || Number.isNaN(start.getTime())) return null;

    return new Date(start.getTime() + duration * hoursPerUnit * MS_PER_HOUR);
}

export function calculateTotalFees(hourlyRate, period, periodUnit) {
    const rate = toFiniteNumber(hourlyRate);
    const duration = toFiniteNumber(period);
    const hoursPerUnit = getHoursPerUnit(periodUnit);

    if (rate === null || rate < 0
        || duration === null || duration <= 0
        || hoursPerUnit === undefined) {
        return null;
    }

    return roundLikeFrontend(rate * duration * hoursPerUnit);
}

export function calculateTotalFeesForStay(hourlyRate, checkInDate, checkOutDate) {
    const rate = toFiniteNumber(hourlyRate);
    const checkIn = new Date(checkInDate).getTime();
    const checkOut = new Date(checkOutDate).getTime();
    if (rate === null || rate < 0
        || !Number.isFinite(checkIn) || !Number.isFinite(checkOut) || checkOut <= checkIn) {
        return null;
    }

    const hours = (checkOut - checkIn) / MS_PER_HOUR;
    return roundLikeFrontend(rate * hours);
}

export function calculateExtraTimeCharge(checkOutDate, hourlyRate, isActive, now = Date.now()) {
    const checkOut = new Date(checkOutDate).getTime();
    const extraTimeStayedMinutes = isActive && Number.isFinite(checkOut) && checkOut < now
        ? Math.floor((now - checkOut) / 60_000)
        : 0;

    if (extraTimeStayedMinutes <= 60) return new Prisma.Decimal(0);

    const rate = toFiniteNumber(hourlyRate);
    if (rate === null || rate < 0) throw new Error('Reservation hourly rate is invalid');
    return roundLikeFrontend(rate * extraTimeStayedMinutes / 60);
}
