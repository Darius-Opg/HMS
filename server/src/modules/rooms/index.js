
import express from 'express';
import { requireAuth, requirePermission } from "../auth/access.js";
import { createRoomType, deleteRoomType, getRoomTypeById, listRoomTypes, updateRoomType } from './roomTypes.js';
import { findAvailableRooms } from './roomAvailability.js';
import { createRoom, deleteRoom, getRoomById, listRooms, setRoomStatus, updateRoom } from './rooms.js';
import { logActivity, logError } from '../audit/logActivity.js';




export function sendError(res, error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'P2002') {
        return res.status(409).json({ error: 'A record with that unique value already exists' });
    }
    if (error.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
    if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Invalid reference, or the record is still in use' });
    }
    logError('rooms module', error);
    return res.status(500).json({ error: 'Internal server error' });
}

export const handle = (fn) => async (req, res) => {
    try {
        await fn(req, res);
    } catch (error) {
        sendError(res, error);
    }
};

export const router = express.Router();

router.use(requireAuth, requirePermission('MANAGE_ROOMS'));

// /types and /availability are declared before /:id so they aren't
// mistaken for a room id.

router.get('/types', handle(async (req, res) => {
    res.json(await listRoomTypes());
}));

router.post('/types', handle(async (req, res) => {
    const roomType = await createRoomType(req.body ?? {});
    await logActivity({ action: 'ROOM_TYPE_CREATED', entityType: 'ROOM_TYPE', entityId: roomType.id, performedById: req.user.id, metadata: { name: roomType.name } });
    res.status(201).json(roomType);
}));

router.get('/types/:id', handle(async (req, res) => {
    res.json(await getRoomTypeById(req.params.id));
}));

router.patch('/types/:id', handle(async (req, res) => {
    const roomType = await updateRoomType(req.params.id, req.body ?? {});
    await logActivity({ action: 'ROOM_TYPE_UPDATED', entityType: 'ROOM_TYPE', entityId: roomType.id, performedById: req.user.id, metadata: { name: roomType.name } });
    res.json(roomType);
}));

router.delete('/types/:id', handle(async (req, res) => {
    const roomType = await deleteRoomType(req.params.id);
    await logActivity({ action: 'ROOM_TYPE_DELETED', entityType: 'ROOM_TYPE', entityId: roomType.id, performedById: req.user.id, metadata: { name: roomType.name } });
    res.status(204).end();
}));

router.get('/availability', handle(async (req, res) => {
    const { checkIn, checkOut, roomTypeId, capacity } = req.query;
    res.json(
        await findAvailableRooms({
            checkInDate: checkIn,
            checkOutDate: checkOut,
            roomTypeId,
            capacity: capacity === undefined ? undefined : Number(capacity),
        }),
    );
}));

router.get('/', handle(async (req, res) => {
    const { roomTypeId, status } = req.query;
    res.json(await listRooms({ roomTypeId, status }));
}));

router.post('/', handle(async (req, res) => {
    const room = await createRoom(req.body ?? {});
    await logActivity({ action: 'ROOM_CREATED', entityType: 'ROOM', entityId: room.id, performedById: req.user.id, metadata: { roomNumber: room.roomNumber } });
    res.status(201).json(room);
}));

router.get('/:id', handle(async (req, res) => {
    res.json(await getRoomById(req.params.id));
}));

router.patch('/:id', handle(async (req, res) => {
    const room = await updateRoom(req.params.id, req.body ?? {});
    await logActivity({ action: 'ROOM_UPDATED', entityType: 'ROOM', entityId: room.id, performedById: req.user.id, metadata: { roomNumber: room.roomNumber } });
    res.json(room);
}));

router.patch('/:id/status', handle(async (req, res) => {
    const room = await setRoomStatus(req.params.id, req.body?.status);
    await logActivity({ action: 'ROOM_STATUS_UPDATED', entityType: 'ROOM', entityId: room.id, performedById: req.user.id, metadata: { roomNumber: room.roomNumber, status: room.status } });
    res.json(room);
}));

router.delete('/:id', handle(async (req, res) => {
    const room = await deleteRoom(req.params.id);
    await logActivity({ action: 'ROOM_DELETED', entityType: 'ROOM', entityId: room.id, performedById: req.user.id, metadata: { roomNumber: room.roomNumber } });
    res.status(204).end();
}));
