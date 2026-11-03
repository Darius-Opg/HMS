import { Prisma } from '../../generated/prisma/index.js';

const HOURS_PER_PERIOD_UNIT = {
    hours: 1,
    days: 24,
    weeks: 24 * 7,
    months: 24 * 30
}

const MS_PER_HOUR = 60 * 60 * 1000;

function getHoursPerUnit(periodUnit) {
    return Object.hasOwn(HOURS_PER_PERIOD_UNIT, periodUnit) ? HOURS_PER_PERIOD_UNIT[periodUnit] : undefined
}

export function calculateStayDate(period, periodUnit, checkInTime) {
    const duration = Number(period);
    const hoursPerUnit = getHoursPerUnit(periodUnit);
    const start = new Date(checkInTime);

    if (!Number.isFinite(duration) || duration <= 0 || hoursPerUnit === undefined || Number.isNaN(start.getTime())) return null;

    return new Date(start.getTime() + duration * hoursPerUnit * MS_PER_HOUR);
}

export function calculateTotalFees(hourlyRate, period, periodUnit) {
    if (hourlyRate === null || hourlyRate === undefined || hourlyRate === "") {
        return null;
    }

    let rate;
    let duration;
    try {
        rate = new Prisma.Decimal(String(hourlyRate));
        duration = new Prisma.Decimal(String(period));
    } catch {
        return null;
    }
    const hoursPerUnit = getHoursPerUnit(periodUnit);

    if (!rate.isFinite() || rate.lt(0)
        || !duration.isFinite() || duration.lte(0)
        || hoursPerUnit === undefined) {
        return null;
    }

    return rate.times(duration).times(hoursPerUnit).toDecimalPlaces(2);
}

export function calculateTotalFeesForStay(hourlyRate, checkInDate, checkOutDate) {
    let rate;
    try {
        rate = new Prisma.Decimal(String(hourlyRate));
    } catch {
        return null;
    }

    const checkIn = new Date(checkInDate).getTime();
    const checkOut = new Date(checkOutDate).getTime();
    if (!rate.isFinite() || rate.lt(0) || !Number.isFinite(checkIn) || !Number.isFinite(checkOut) || checkOut <= checkIn) {
        return null;
    }

    const hours = new Prisma.Decimal(checkOut - checkIn).div(3_600_000);
    return rate.times(hours).toDecimalPlaces(2);
}
