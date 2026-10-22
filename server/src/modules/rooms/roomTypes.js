import { assertUuid, httpError, withLogging, positiveNumber } from './roomHelper.js';
import prisma from "../database/index.js";


export const ROOM_STATUSES = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'];
// OCCUPIED and RESERVED belong to the reservations module, so staff can
// only toggle a room between these two by hand.
export const MANUAL_STATUSES = ['AVAILABLE', 'MAINTENANCE'];

export function emptyCounts() {
    return { total: 0, available: 0, occupied: 0, reserved: 0, maintenance: 0 };
}

// Room counts per type and status, as a Map of roomTypeId -> counts.
export async function roomCountsByType(where = {}) {
    const grouped = await prisma.room.groupBy({
        by: ['roomTypeId', 'status'],
        where,
        _count: { _all: true },
    });

    const byType = new Map();
    for (const row of grouped) {
        const counts = byType.get(row.roomTypeId) ?? emptyCounts();
        const n = row._count._all;
        counts.total += n;
        counts[row.status.toLowerCase()] += n;
        byType.set(row.roomTypeId, counts);
    }
    return byType;
}

export function parseRoomTypeInput(input, { partial }) {
    const { name, description, basePrice, capacity, sizeSqm, features } = input;
    const data = {};

    if (!partial || name !== undefined) {
        if (typeof name !== 'string' || !name.trim()) throw httpError(400, 'name is required');
        data.name = name.trim();
    }
    if (description !== undefined) {
        if (description !== null && typeof description !== 'string') {
            throw httpError(400, 'description must be text');
        }
        data.description = description;
    }
    if (!partial || basePrice !== undefined) {
        data.basePrice = positiveNumber(basePrice, 'basePrice');
    }
    if (!partial || capacity !== undefined) {
        if (!Number.isInteger(capacity) || capacity < 1) {
            throw httpError(400, 'capacity must be a whole number of at least 1');
        }
        data.capacity = capacity;
    }
    if (sizeSqm !== undefined) {
        data.sizeSqm = sizeSqm === null ? null : positiveNumber(sizeSqm, 'sizeSqm');
    }
    if (features !== undefined) {
        if (!Array.isArray(features) || !features.every((f) => typeof f === 'string')) {
            throw httpError(400, 'features must be an array of text values');
        }
        data.features = { set: features };
    }
    return data;
}

export const createRoomType = withLogging('createRoomType', async (input = {}) => {
    const data = parseRoomTypeInput(input, { partial: false });
    return prisma.roomType.create({ data });
});

export const listRoomTypes = withLogging('listRoomTypes', async () => {
    const [types, countsByType] = await Promise.all([
        prisma.roomType.findMany({ orderBy: { name: 'asc' } }),
        roomCountsByType(),
    ]);
    return types.map((type) => ({
        ...type,
        roomCounts: countsByType.get(type.id) ?? emptyCounts(),
    }));
    
});

export const getRoomTypeById = withLogging('getRoomTypeById', async (id) => {
    assertUuid(id, 'room type id');
    const type = await prisma.roomType.findUnique({ where: { id } });
    if (!type) throw httpError(404, 'Room type not found');
    const countsByType = await roomCountsByType({ roomTypeId: id });
    return { ...type, roomCounts: countsByType.get(id) ?? emptyCounts() };
});

export const updateRoomType = withLogging('updateRoomType', async (id, input = {}) => {
    assertUuid(id, 'room type id');
    const data = parseRoomTypeInput(input, { partial: true });
    return prisma.roomType.update({ where: { id }, data });
});

export const deleteRoomType = withLogging('deleteRoomType', async (id) => {
    assertUuid(id, 'room type id');
    const roomCount = await prisma.room.count({ where: { roomTypeId: id } });
    if (roomCount > 0) {
        throw httpError(409, `Room type is used by ${roomCount} room(s); reassign or delete them first`);
    }
    return prisma.roomType.delete({ where: { id } });
});