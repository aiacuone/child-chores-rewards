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

/** Hash a PIN as "scrypt$<salt>$<hash>", both base64url. */
export function hashPin(pin: string) {
	if (!isPin(pin)) throw new Error('a PIN is 4 digits');
	const salt = randomBytes(16);
	const hash = scryptSync(pin, salt, KEY_LENGTH, PARAMS);
	return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

/** True when the PIN matches the stored hash. */
export function verifyPin(pin: string, stored: string) {
	if (!isPin(pin)) return false;
	const [kind, salt, hash] = stored.split('$');
	if (kind !== 'scrypt' || !salt || !hash) return false;
	const expected = Buffer.from(hash, 'base64url');
	const actual = scryptSync(pin, Buffer.from(salt, 'base64url'), expected.length, PARAMS);
	return timingSafeEqual(actual, expected);
}
