
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

    const rate = Number(hourlyRate);
    const duration = Number(period);
    const hoursPerUnit = getHoursPerUnit(periodUnit);

    if (!Number.isFinite(rate) || rate < 0
        || !Number.isFinite(duration) || duration <= 0
        || hoursPerUnit === undefined) {
        return null;
    }

    return Math.round(rate * duration * hoursPerUnit * 100) / 100;
}

