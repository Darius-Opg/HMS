
import express from 'express';
import { requireAuth, requirePermission } from "../auth/access.js";
import { deleteRoomType, listRoomTypes, updateRoomType } from './roomTypes.js';
import { findAvailableRooms } from './roomAvailability.js';
import { createRoom, deleteRoom, getRoomById, listRooms, setRoomStatus, updateRoom } from './rooms.js';




export function sendError(res, error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'P2002') {
        return res.status(409).json({ error: 'A record with that unique value already exists' });
    }
    if (error.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
    if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Invalid reference, or the record is still in use' });
    }
    console.error('rooms module error:', error); // temporary, until logging lands
    return res.status(500).json({ error: 'Internal server error' });
}

const handle = (fn) => async (req, res) => {
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
    res.status(201).json(await createRoomType(req.body ?? {}));
}));

router.get('/types/:id', handle(async (req, res) => {
    res.json(await getRoomTypeById(req.params.id));
}));

router.patch('/types/:id', handle(async (req, res) => {
    res.json(await updateRoomType(req.params.id, req.body ?? {}));
}));

router.delete('/types/:id', handle(async (req, res) => {
    await deleteRoomType(req.params.id);
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
    res.status(201).json(await createRoom(req.body ?? {}));
}));

router.get('/:id', handle(async (req, res) => {
    res.json(await getRoomById(req.params.id));
}));

router.patch('/:id', handle(async (req, res) => {
    res.json(await updateRoom(req.params.id, req.body ?? {}));
}));

router.patch('/:id/status', handle(async (req, res) => {
    res.json(await setRoomStatus(req.params.id, req.body?.status));
}));

router.delete('/:id', handle(async (req, res) => {
    await deleteRoom(req.params.id);
    res.status(204).end();
}));

