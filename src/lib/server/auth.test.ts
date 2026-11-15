import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import {
	SESSION_TTL,
	clearFailures,
	createSession,
	invalidateSession,
	isFirstRun,
	isRateLimited,
	recordFailure,
	signInGoogleUser,
	validateSession
} from './auth';

const mum = { sub: 'g-1', email: 'mum@example.com', name: 'Mum' };
const dad = { sub: 'g-2', email: 'dad@example.com', name: 'Dad' };

let opened: ReturnType<typeof openDatabase>;
beforeEach(() => (opened = openDatabase(':memory:')));
afterEach(() => opened.sqlite.close());

describe('signing in', () => {
	it('creates a family with the first account as its owner', () => {
		const { db } = opened;
		expect(isFirstRun(db)).toBe(true);
		const result = signInGoogleUser(db, mum);
		expect(result.created).toBe(true);
		expect(isFirstRun(db)).toBe(false);
		const [user] = db.select().from(schema.user).all();
		expect(user).toMatchObject({ role: 'owner', email: mum.email, name: 'Mum' });
	});

	it('finds the same grown-up again without a new family', () => {
		const { db } = opened;
		const first = signInGoogleUser(db, mum);
		const again = signInGoogleUser(db, mum);
		expect(again).toEqual({ id: first.id, created: false });
		expect(db.select().from(schema.family).all()).toHaveLength(1);
	});

	it('gives an account that was not invited its own family', () => {
		const { db } = opened;
		signInGoogleUser(db, mum);
		signInGoogleUser(db, dad);
		const users = db.select().from(schema.user).all();
		expect(new Set(users.map((u) => u.familyId)).size).toBe(2);
		expect(users.every((u) => u.role === 'owner')).toBe(true);
	});

	it('follows a changed Google email', () => {
		const { db } = opened;
		const { id } = signInGoogleUser(db, mum);
		signInGoogleUser(db, { ...mum, email: 'mum@new.example.com' });
		const [user] = db.select().from(schema.user).all();
		expect(user).toMatchObject({ id, email: 'mum@new.example.com' });
	});
});

describe('sessions', () => {
	const now = Date.UTC(2026, 10, 15, 9);

	it('keeps a grown-up signed in with a token stored only as a hash', () => {
		const { db } = opened;
		const { id } = signInGoogleUser(db, mum);
		const { token } = createSession(db, id, now);
		const [row] = db.select().from(schema.session).all();
		expect(row.id).not.toBe(token);
		expect(validateSession(db, token, now + 1000)?.user).toMatchObject({ id, email: mum.email });
	});

	it('rejects and removes an expired session', () => {
		const { db } = opened;
		const { id } = signInGoogleUser(db, mum);
		const { token } = createSession(db, id, now);
		expect(validateSession(db, token, now + SESSION_TTL)).toBeNull();
		expect(db.select().from(schema.session).all()).toHaveLength(0);
	});

	it('renews a session once it is more than half used', () => {
		const { db } = opened;
		const { id } = signInGoogleUser(db, mum);
		const { token, expiresAt } = createSession(db, id, now);
		const early = validateSession(db, token, now + SESSION_TTL / 4);
		expect(early?.expiresAt.getTime()).toBe(expiresAt.getTime());
		const later = now + SESSION_TTL * 0.75;
		expect(validateSession(db, token, later)?.expiresAt.getTime()).toBe(later + SESSION_TTL);
	});

	it('signs out this device', () => {
		const { db } = opened;
		const { id } = signInGoogleUser(db, mum);
		const { token } = createSession(db, id, now);
		invalidateSession(db, token);
		expect(validateSession(db, token, now)).toBeNull();
	});

	it('rejects an unknown token', () => {
		expect(validateSession(opened.db, 'nope', now)).toBeNull();
	});
});

describe('rate limit', () => {
	it('blocks after 10 failures in 15 minutes, then lets go', () => {
		const ip = '203.0.113.9';
		const t = 1_000_000;
		for (let i = 0; i < 9; i++) recordFailure(ip, t);
		expect(isRateLimited(ip, t)).toBe(false);
		recordFailure(ip, t);
		expect(isRateLimited(ip, t)).toBe(true);
		expect(isRateLimited(ip, t + 15 * 60 * 1000 + 1)).toBe(false);
		clearFailures(ip);
	});
});
