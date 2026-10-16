
import 'dotenv/config';
import prisma from '../src/modules/database/index.js';
import { createUser } from '../src/modules/users/index.js';

const REQUIRED_VARS = [
    'SEED_ADMIN_NAME',
    'SEED_ADMIN_EMAIL',
    'SEED_ADMIN_PASSWORD',
    'SEED_ADMIN_PHONE',
    'SEED_ADMIN_ID_NUMBER',
];

const ROOM_TYPES = [
    {
        name: 'Standard',
        description: 'Comfortable room with a queen bed',
        basePrice: 650,
        capacity: 2,
        sizeSqm: 22,
        features: ['Wi-Fi', 'TV', 'Air conditioning'],
    },
    {
        name: 'Deluxe',
        description: 'Spacious room with a king bed and balcony',
        basePrice: 950,
        capacity: 2,
        sizeSqm: 30,
        features: ['Wi-Fi', 'TV', 'Air conditioning', 'King bed', 'Balcony'],
    },
    {
        name: 'Executive Suite',
        description: 'Suite with a separate living area',
        basePrice: 1800,
        capacity: 4,
        sizeSqm: 55,
        features: ['Wi-Fi', 'TV', 'Air conditioning', 'King bed', 'Living area', 'Minibar'],
    },
    {
        name: 'Family Room',
        description: 'Spacious room designed for families with two queen beds',
        basePrice: 1250,
        capacity: 4,
        sizeSqm: 40,
        features: ['Wi-Fi', 'TV', 'Air conditioning', 'Two queen beds'],
    },
    {
        name: 'Suite',
        description: 'Room with a king bed and separate living area',
        basePrice: 1500,
        capacity: 2,
        sizeSqm: 45,
        features: ['Wi-Fi', 'TV', 'Air conditioning', 'King bed', 'Living area'],
    },
];

const ROOMS = [
    { roomNumber: '101', floor: 1, type: 'Standard', roomColor: 'Ivory', color: 'Ivory', features: { view: 'garden' } },
    { roomNumber: '102', floor: 1, type: 'Standard', roomColor: 'Sand', color: 'Sand', features: { view: 'garden' } },
    { roomNumber: '103', floor: 1, type: 'Standard', roomColor: 'Ivory', color: 'Ivory', features: { view: 'garden' } },
    { roomNumber: '104', floor: 1, type: 'Standard', roomColor: 'Sage', status: 'MAINTENANCE' },
    { roomNumber: '201', floor: 2, type: 'Deluxe', roomColor: 'Champagne', color: 'Champaigne', features: { view: 'pool' } },
    { roomNumber: '202', floor: 2, type: 'Deluxe', roomColor: 'Champagne', color: 'Champaine' },
    { roomNumber: '203', floor: 2, type: 'Deluxe', roomColor: 'Ivory', color: 'Ivory', features: { view: 'pool' } },
    { roomNumber: '204', floor: 2, type: 'Deluxe', roomColor: 'Sand', color: 'Sand', features: { view: 'pool' } },
    { roomNumber: '301', floor: 3, type: 'Executive Suite', roomColor: 'Slate', color: 'Slate', features: { view: 'city', extraBed: true } },
    { roomNumber: '302', floor: 3, type: 'Executive Suite', roomColor: 'Slate', color: 'Slate', features: { view: 'city', extraBed: true } },
];

async function seedRooms() {
    const typeIds = {};

    for (const { name, features, ...rest } of ROOM_TYPES) {
        const type = await prisma.roomType.upsert({
            where: { name },
            update: { ...rest, features: { set: features } },
            create: { name, ...rest, features },
        });
        typeIds[name] = type.id;
    }

    for (const { roomNumber, type, status, ...rest } of ROOMS) {
        const fields = { ...rest, roomTypeId: typeIds[type] };
        await prisma.room.upsert({
            where: { roomNumber },
            update: fields, // status is deliberately left out so a reseed never resets it
            create: { roomNumber, ...fields, ...(status && { status }) },
        });
    }

    console.log(`Seeded ${ROOM_TYPES.length} room types and ${ROOMS.length} rooms.`);
}

async function main() {
    await seedRooms();
    const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
    if (missing.length) {
        throw new Error(`Missing required env vars for seeding: ${missing.join(', ')}`);
    }

    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (existingAdmin) {
        console.log('An admin account already exists — skipping seed.');
        return;
    }

    const admin = await createUser({
        name: process.env.SEED_ADMIN_NAME,
        email: process.env.SEED_ADMIN_EMAIL,
        password: process.env.SEED_ADMIN_PASSWORD,
        phone: process.env.SEED_ADMIN_PHONE,
        idNumber: process.env.SEED_ADMIN_ID_NUMBER,
        role: 'ADMIN',
    });

    console.log(`Admin account created: ${admin.email}`);
}


main()
    .catch((err) => {
        console.error('Seed failed:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });