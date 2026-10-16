
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64');
const HASH_KEY = process.env.HASH_KEY;


if (ENCRYPTION_KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be set and base64-decode to exactly 32 bytes');
}

if (!HASH_KEY) {
    throw new Error('HASH_KEY must be set');
}

export function encrypt(plaintext) {
    if (plaintext === null || plaintext === undefined) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(packed) {
    if (packed === null || packed === undefined) return null;
    const data = Buffer.from(packed, 'base64');
    const iv = data.slice(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// used only for WHERE lookups
export function hash(value) {
    if (value === null || value === undefined) return null;
    return crypto.createHmac('sha256', HASH_KEY).update(String(value)).digest('hex');
}