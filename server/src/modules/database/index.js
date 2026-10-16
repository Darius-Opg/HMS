
import { PrismaClient } from '../../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma = new PrismaClient({
    adapter,
    omit: {
        user: { password: true, phoneEncrypted: true, phoneHash: true, idNumberEncrypted: true, idNumberHash: true },
        guest: { phoneEncrypted: true, phoneHash: true, idNumberEncrypted: true, idNumberHash: true },
    },
});

export default prisma;