import { httpError, withLogging, assertUuid } from './roomHelper.js';
import {ROOM_STATUSES, MANUAL_STATUSES } from './roomTypes.js';
import prisma from "../database/index.js";

export function parseRoomInput(input, { partial }) {
    const { roomNumber, floor, color, roomColor, features, roomTypeId } = input;
    const data = {};

    if (!partial || roomNumber !== undefined) {
        const value = roomNumber === undefined || roomNumber === null ? '' : String(roomNumber).trim();
        if (!value) throw httpError(400, 'roomNumber is required');
        data.roomNumber = value;
    }
    if (floor !== undefined) {
        if (floor !== null && !Number.isInteger(floor)) throw httpError(400, 'floor must be a whole number');
        data.floor = floor;
    }
    if (color !== undefined) {
        if (color !== null && typeof color !== 'string') throw httpError(400, 'color must be text');
        data.color = color;
    }
    if (roomColor !== undefined) {
        if (roomColor !== null && typeof roomColor !== 'string') {
            throw httpError(400, 'roomColor must be text');
        }
        data.roomColor = roomColor;
    }
    if (features !== undefined) {
        // null can't be sent for a Json field without Prisma's special null
        // values, so "clear" is done by sending {} instead.
        if (features === null || typeof features !== 'object') {
            throw httpError(400, 'features must be an object or array (send {} to clear)');
        }
        data.features = features;
    }
    if (!partial || roomTypeId !== undefined) {
        assertUuid(roomTypeId, 'roomTypeId');
        data.roomTypeId = roomTypeId;
    }
    return data;
}

export const createRoom = withLogging('createRoom', async (input = {}) => {
    const data = parseRoomInput(input, { partial: false });
    return prisma.room.create({ data, include: { roomType: true } });
});

export const listRooms = withLogging('listRooms', async ({ roomTypeId, status } = {}) => {
    const where = {};
    if (roomTypeId !== undefined) {
        assertUuid(roomTypeId, 'roomTypeId');
        where.roomTypeId = roomTypeId;
    }
    if (status !== undefined) {
        if (!ROOM_STATUSES.includes(status)) {
            throw httpError(400, `status must be one of: ${ROOM_STATUSES.join(', ')}`);
        }
        where.status = status;
    }
    return prisma.room.findMany({
        where,
        include: { roomType: true },
        orderBy: { roomNumber: 'asc' },
    });
});

export const getRoomById = withLogging('getRoomById', async (id) => {
    assertUuid(id, 'room id');
    const room = await prisma.room.findUnique({ where: { id }, include: { roomType: true } });
    if (!room) throw httpError(404, 'Room not found');
    return room;
});

export const updateRoom = withLogging('updateRoom', async (id, input = {}) => {
    assertUuid(id, 'room id');
    const data = parseRoomInput(input, { partial: true });
    return prisma.room.update({ where: { id }, data, include: { roomType: true } });
});

export const setRoomStatus = withLogging('setRoomStatus', async (id, status) => {
    assertUuid(id, 'room id');
    if (!MANUAL_STATUSES.includes(status)) {
        throw httpError(400, `status must be one of: ${MANUAL_STATUSES.join(', ')}`);
    }
    const room = await prisma.room.findUnique({ where: { id }, select: { status: true } });
    if (!room) throw httpError(404, 'Room not found');
    if (room.status === 'OCCUPIED' || room.status === 'RESERVED') {
        throw httpError(409, `Room is ${room.status}; its status is managed by reservations`);
    }
    return prisma.room.update({ where: { id }, data: { status }, include: { roomType: true } });
});

export const deleteRoom = withLogging('deleteRoom', async (id) => {
    assertUuid(id, 'room id');
    const reservationCount = await prisma.reservation.count({ where: { roomId: id } });
    if (reservationCount > 0) {
        throw httpError(
            409,
            'Room has reservation history and cannot be deleted; set it to MAINTENANCE instead',
        );
    }
    return prisma.room.delete({ where: { id } });
});