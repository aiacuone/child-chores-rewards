// Grown-up mode (ADR 0007) and the wrong-PIN lockout (docs/SPEC.md, "Grown-up
// mode and PIN").
// - The right PIN gives a grown-up token. The page keeps it only in memory and
//   sends it with every grown-up request; the server keeps its hash, tied to
//   the family and to this device's session.
// - A token lasts AUTO_LOCK after its last use. The page locks itself at that
//   time; the server allows a little longer (GRACE) because the page reports
//   touches at most every 30 seconds.
// - Wrong PINs are counted per family. 5 in a row lock the pad for 30 s; each
//   wrong PIN after that locks it for 1 min, 5 min, then 15 min. The right PIN
//   resets the count. While locked, the PIN is not even checked.
import { createHash, randomBytes } from 'node:crypto';
import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, gt } from 'drizzle-orm';
import { schema, type Db } from './db';
import type { FamilyScope } from './family';
import { verifyPin } from './pin';

import { AUTO_LOCK } from '../grownup-times';

const GRACE = 45 * 1000;
export const FAILS_BEFORE_LOCK = 5;
export const LOCK_STEPS = [30_000, 60_000, 5 * 60_000, 15 * 60_000];

/** The header a grown-up request carries its token in. */
export const GROWNUP_HEADER = 'x-grown-up';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const isToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);

type PinRefused =
	| { ok: false; reason: 'wrong' }
	| { ok: false; reason: 'locked'; until: number; firstLock: boolean };

export type PinResult = { ok: true } | PinRefused;
export type UnlockResult = { ok: true; token: string } | PinRefused;

function pinState(db: Pick<Db, 'select'>, familyId: number) {
	const [row] = db
		.select({
			pinHash: schema.family.pinHash,
			fails: schema.family.pinFails,
			stage: schema.family.pinLockStage,
			lockedUntil: schema.family.pinLockedUntil
		})
		.from(schema.family)
		.where(eq(schema.family.id, familyId))
		.all();
	return row;
}

/** When the family's PIN pad unlocks again, or null when it is not locked. */
export function padLockedUntil(scope: FamilyScope, now = Date.now()) {
	const until = pinState(scope.db, scope.familyId)?.lockedUntil?.getTime() ?? 0;
	return until > now ? until : null;
}

/** Check a PIN against the family's hash, counting a wrong one towards the lock. */
function tryPin(
	tx: Pick<Db, 'select' | 'update'>,
	familyId: number,
	pin: string,
	now: number
): PinResult {
	const row = pinState(tx, familyId);
	if (!row?.pinHash) return { ok: false, reason: 'wrong' };
	const lockedUntil = row.lockedUntil?.getTime() ?? 0;
	if (lockedUntil > now)
		return { ok: false, reason: 'locked', until: lockedUntil, firstLock: false };

	const family = eq(schema.family.id, familyId);
	if (verifyPin(pin, row.pinHash)) {
		tx.update(schema.family)
			.set({ pinFails: 0, pinLockStage: 0, pinLockedUntil: null })
			.where(family)
			.run();
		return { ok: true };
	}

	const fails = row.stage === 0 ? row.fails + 1 : row.fails;
	const stage =
		row.stage > 0 ? Math.min(row.stage + 1, LOCK_STEPS.length) : fails >= FAILS_BEFORE_LOCK ? 1 : 0;
	const until = stage > 0 ? now + LOCK_STEPS[stage - 1] : null;
	tx.update(schema.family)
		.set({
			pinFails: fails,
			pinLockStage: stage,
			pinLockedUntil: until === null ? null : new Date(until)
		})
		.where(family)
		.run();
	if (until === null) return { ok: false, reason: 'wrong' };
	return { ok: false, reason: 'locked', until, firstLock: stage === 1 };
}

/** Check the PIN again inside grown-up mode. Wrong tries count towards the same lock. */
export function checkPin(scope: FamilyScope, pin: string, now = Date.now()): PinResult {
	return scope.db.transaction((tx) => tryPin(tx, scope.familyId, pin, now));
}

/** Check a PIN typed on this device's pad. */
export function unlock(
	scope: FamilyScope,
	sessionId: string,
	pin: string,
	now = Date.now()
): UnlockResult {
	return scope.db.transaction((tx) => {
		const result = tryPin(tx, scope.familyId, pin, now);
		if (!result.ok) return result;
		const token = randomBytes(32).toString('base64url');
		tx.insert(schema.grownupToken)
			.values({
				id: hashToken(token),
				familyId: scope.familyId,
				sessionId,
				expiresAt: new Date(now + AUTO_LOCK + GRACE)
			})
			.run();
		return { ok: true, token };
	});
}

/**
 * Check a grown-up token for this family and device, and push its expiry back.
 * False when it is unknown, expired, or from another family or device.
 */
export function useToken(scope: FamilyScope, sessionId: string, token: unknown, now = Date.now()) {
	if (!isToken(token)) return false;
	const changed = scope.db
		.update(schema.grownupToken)
		.set({ expiresAt: new Date(now + AUTO_LOCK + GRACE) })
		.where(
			and(
				eq(schema.grownupToken.id, hashToken(token)),
				eq(schema.grownupToken.familyId, scope.familyId),
				eq(schema.grownupToken.sessionId, sessionId),
				gt(schema.grownupToken.expiresAt, new Date(now))
			)
		)
		.run().changes;
	return changed === 1;
}

/** End grown-up mode for this token. */
export function endToken(scope: FamilyScope, token: unknown) {
	if (!isToken(token)) return;
	scope.db
		.delete(schema.grownupToken)
		.where(scope.where(schema.grownupToken, eq(schema.grownupToken.id, hashToken(token))))
		.run();
}

/**
 * For grown-up API routes: refuse with 401 unless the request carries a working
 * grown-up token for the signed-in family and this device.
 */
export function requireGrownUp(event: RequestEvent, scope: FamilyScope) {
	const { sessionId } = event.locals;
	if (!sessionId || !useToken(scope, sessionId, event.request.headers.get(GROWNUP_HEADER)))
		error(401, 'Grown-up mode is locked');
}
