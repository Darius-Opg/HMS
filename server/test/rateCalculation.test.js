import assert from 'node:assert/strict';
import test from 'node:test';
import {
    calculateExtraTimeCharge,
    calculateStayDate,
    calculateTotalFees,
    calculateTotalFeesForStay,
} from '../src/modules/guests/rateCalculation.js';
import { calculateTotalFees as calculateDisplayedFees } from '../../client/src/lib/rates.js';

test('calculates total fees from the hourly room rate and full stay duration', () => {
    assert.equal(calculateTotalFees('100.00', '1', 'days').toFixed(2), '2400.00');
    assert.equal(calculateTotalFees('12.35', '1.5', 'hours').toFixed(2), '18.53');
    assert.equal(calculateTotalFees('25.50', '1', 'weeks').toFixed(2), '4284.00');
});

test('returns null for invalid rates, durations, and units', () => {
    assert.equal(calculateTotalFees('invalid', '1', 'hours'), null);
    assert.equal(calculateTotalFees('10', '0', 'hours'), null);
    assert.equal(calculateTotalFees('10', '1', 'years'), null);
});

test('calculates reservation totals consistently from check-in and check-out timestamps', () => {
    const checkIn = new Date('2026-11-01T10:00:00.000Z');
    const checkOut = calculateStayDate(1, 'days', checkIn);

    assert.equal(calculateTotalFeesForStay('100.00', checkIn, checkOut).toFixed(2), '2400.00');
    assert.equal(
        calculateTotalFeesForStay('1250.00', checkIn, calculateStayDate(5, 'hours', checkIn)).toFixed(2),
        '6250.00',
    );
    assert.equal(calculateTotalFeesForStay('12.35', checkIn, new Date(checkIn.getTime() + 90 * 60_000)).toFixed(2), '18.53');
    assert.equal(calculateTotalFeesForStay('100.00', checkOut, checkIn), null);
});

test('calculates overdue occupancy fees using the frontend hourly-rate rounding', () => {
    const checkOut = new Date('2026-11-01T10:00:00.000Z');
    const now = new Date(checkOut.getTime() + 61 * 60_000);

    assert.equal(calculateExtraTimeCharge(checkOut, '12.35', true, now).toFixed(2), '12.56');
    assert.equal(calculateExtraTimeCharge(checkOut, '12.35', true, new Date(checkOut.getTime() + 60 * 60_000)).toFixed(2), '0.00');
    assert.equal(calculateExtraTimeCharge(checkOut, '12.35', false, now).toFixed(2), '0.00');
});

test('a fully paid booked stay has no balance from elapsed time after its scheduled checkout', () => {
    const checkOut = new Date('2026-11-01T10:00:00.000Z');
    const now = new Date(checkOut.getTime() + 108 * 60 * 60_000);
    const total = 21_600;
    const amountPaid = 21_600;
    const extraTimeCharge = calculateExtraTimeCharge(checkOut, '1800.00', false, now);
    const balance = Math.max(total + Number(extraTimeCharge.toString()) - amountPaid, 0);

    assert.equal(extraTimeCharge.toFixed(2), '0.00');
    assert.equal(balance, 0);
});

test('displayed fees match the amount calculated for payment', () => {
    for (const [rate, period, unit] of [
        ['100.00', '1', 'days'],
        ['12.35', '1.5', 'hours'],
        ['25.50', '1', 'weeks'],
    ]) {
        assert.equal(
            calculateDisplayedFees(rate, period, unit),
            Number(calculateTotalFees(rate, period, unit).toFixed(2)),
        );
    }
});
