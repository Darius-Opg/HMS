import assert from 'node:assert/strict';
import test from 'node:test';
import { reservationOverlapWhere } from '../src/modules/rooms/roomHelper.js';

test('availability conflicts include overlapping booked stays', () => {
    const checkIn = new Date('2026-11-01T10:00:00.000Z');
    const checkOut = new Date('2026-11-02T10:00:00.000Z');
    const filter = reservationOverlapWhere(checkIn, checkOut);

    assert.deepEqual(filter.OR[0], {
        status: 'BOOKED',
        checkInDate: { lt: checkOut },
        checkOutDate: { gt: checkIn },
    });
});

test('availability conflicts use actual check-in time for active stays', () => {
    const checkIn = new Date('2026-11-01T10:00:00.000Z');
    const checkOut = new Date('2026-11-02T10:00:00.000Z');
    const filter = reservationOverlapWhere(checkIn, checkOut);

    assert.deepEqual(filter.OR[1], {
        status: 'CHECKED_IN',
        actualCheckOut: null,
        OR: [
            { actualCheckIn: { lt: checkOut } },
            { actualCheckIn: null, checkInDate: { lt: checkOut } },
        ],
        checkOutDate: { gt: checkIn },
    });
});

test('reservation modification can exclude its own reservation from conflicts', () => {
    const filter = reservationOverlapWhere(new Date(10), new Date(20), 'reservation-id');

    assert.deepEqual(filter.id, { not: 'reservation-id' });
});
