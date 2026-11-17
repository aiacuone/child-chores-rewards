// Sessions and accounts. Adapted from shtrong's sign-in code (ADR 0005):
// a random token in an httpOnly cookie, stored hashed, lasting 60 days and
// renewed while in use.
import { createHash, randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { count, eq } from 'drizzle-orm';
import { schema, type Db } from './db';

const DAY = 24 * 60 * 60 * 1000;
export const SESSION_TTL = 60 * DAY;
export const SESSION_COOKIE = 'session';

export type GoogleProfile = { sub: string; email: string; name: string };
export type SignedInUser = {
	id: number;
	familyId: number;
	role: 'owner' | 'grownup';
	email: string;
	name: string;
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** True until the first family has been created. */
export function isFirstRun(db: Db) {
	const [row] = db.select({ n: count() }).from(schema.family).all();
	return row.n === 0;
}

/**
 * Find the grown-up for a verified Google account, or create one.
 * An account the app has not seen starts its own family and owns it.
 * Invites (joining an existing family) come later.
 */
export function signInGoogleUser(db: Db, profile: GoogleProfile) {
	return db.transaction((tx) => {
		const [found] = tx.select().from(schema.user).where(eq(schema.user.googleSub, profile.sub)).all();
		if (found) {
			if (found.email !== profile.email) {
				const [clash] = tx
					.select({ id: schema.user.id })
					.from(schema.user)
					.where(eq(schema.user.email, profile.email))
					.all();
				if (!clash)
					tx.update(schema.user).set({ email: profile.email }).where(eq(schema.user.id, found.id)).run();
			}
			return { id: found.id, created: false };
		}

		const [fam] = tx.insert(schema.family).values({ name: 'Our family' }).returning().all();
		const [created] = tx
			.insert(schema.user)
			.values({
				familyId: fam.id,
				role: 'owner',
				email: profile.email,
				googleSub: profile.sub,
				name: profile.name
			})
			.returning()
			.all();
		return { id: created.id, created: true };
	});
}

export function createSession(db: Db, userId: number, now = Date.now()) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(now + SESSION_TTL);
	db.insert(schema.session).values({ id: hashToken(token), userId, expiresAt }).run();
	return { token, expiresAt };
}

/** The signed-in grown-up for a cookie token, renewing the session when it is half used. */
export function validateSession(db: Db, token: string, now = Date.now()) {
	const id = hashToken(token);
	const [row] = db
		.select({ session: schema.session, user: schema.user })
		.from(schema.session)
		.innerJoin(schema.user, eq(schema.session.userId, schema.user.id))
		.where(eq(schema.session.id, id))
		.all();
	if (!row) return null;

	if (row.session.expiresAt.getTime() <= now) {
		db.delete(schema.session).where(eq(schema.session.id, id)).run();
		return null;
	}

	let expiresAt = row.session.expiresAt;
	if (expiresAt.getTime() - now < SESSION_TTL / 2) {
		expiresAt = new Date(now + SESSION_TTL);
		db.update(schema.session).set({ expiresAt }).where(eq(schema.session.id, id)).run();
	}
	const { id: userId, familyId, role, email, name } = row.user;
	const user: SignedInUser = { id: userId, familyId, role, email, name };
	return { user, expiresAt, sessionId: id };
}

/** Sign out this device. */
export function invalidateSession(db: Db, token: string) {
	db.delete(schema.session).where(eq(schema.session.id, hashToken(token))).run();
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date, secure: boolean) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		expires: expiresAt
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

// Failed sign-ins per address: 10 in 15 minutes, then a wait.
const failures = new Map<string, { count: number; first: number }>();
const WINDOW = 15 * 60 * 1000;

export function isRateLimited(key: string, now = Date.now()) {
	const f = failures.get(key);
	if (!f) return false;
	if (now - f.first > WINDOW) {
		failures.delete(key);
		return false;
	}
	return f.count >= 10;
}

export function recordFailure(key: string, now = Date.now()) {
	const f = failures.get(key);
	if (!f || now - f.first > WINDOW) failures.set(key, { count: 1, first: now });
	else f.count++;
}

export function clearFailures(key: string) {
	failures.delete(key);
}
