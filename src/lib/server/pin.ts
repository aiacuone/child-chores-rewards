// The grown-up PIN (ADR 0007). It is stored only as a salted scrypt hash and is
// never logged or sent back to the page. A 4-digit PIN has only 10,000 values,
// so the hash slows down guessing from a stolen database copy; the wrong-PIN
// lockout (#19) is what protects the live app.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 32;
// N=2^15 takes about 50 ms per check, slow for guessing but fine for one tap.
const PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const isPin = (pin: unknown): pin is string =>
	typeof pin === 'string' && /^\d{4}$/.test(pin);

/** An emailed PIN reset code: 6 digits. */
export const isResetCode = (code: unknown): code is string =>
	typeof code === 'string' && /^\d{6}$/.test(code);

function hashSecret(secret: string) {
	const salt = randomBytes(16);
	const hash = scryptSync(secret, salt, KEY_LENGTH, PARAMS);
	return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

function verifySecret(secret: string, stored: string) {
	const [kind, salt, hash] = stored.split('$');
	if (kind !== 'scrypt' || !salt || !hash) return false;
	const expected = Buffer.from(hash, 'base64url');
	const actual = scryptSync(secret, Buffer.from(salt, 'base64url'), expected.length, PARAMS);
	return timingSafeEqual(actual, expected);
}

/** Hash a PIN as "scrypt$<salt>$<hash>", both base64url. */
export function hashPin(pin: string) {
	if (!isPin(pin)) throw new Error('a PIN is 4 digits');
	return hashSecret(pin);
}

/** True when the PIN matches the stored hash. */
export const verifyPin = (pin: string, stored: string) => isPin(pin) && verifySecret(pin, stored);

/** Hash a reset code the same way, so a stolen database copy does not give it away. */
export function hashResetCode(code: string) {
	if (!isResetCode(code)) throw new Error('a reset code is 6 digits');
	return hashSecret(code);
}

export const verifyResetCode = (code: string, stored: string) =>
	isResetCode(code) && verifySecret(code, stored);
