// A child's optional picture passcode (docs/how-it-works/children.md). It keeps
// a brother or sister out of a trip; it is not strong security, so wrong tries
// are slowed down and the pictures are stored only as a hash.
import { and, eq, gt, inArray, lte } from 'drizzle-orm';
import type { PictureId } from '../passcode';
import { schema } from './db';
import type { FamilyScope } from './family';
import { hashPasscode, verifyPasscode } from './pin';

export const WRONG_BEFORE_WAIT = 5;
export const WAIT_MS = 30_000;
/** An open trip nobody has used for this long needs its pictures again. */
export const OPEN_MS = 60 * 60_000;

export type PasscodeAnswer =
	{ result: 'ok' } | { result: 'wrong' } | { result: 'wait'; seconds: number };

/** The child id in an address, or null when it is not a whole number. */
export const childIdFrom = (raw: string | undefined) =>
	raw && /^\d{1,9}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;

function row(scope: FamilyScope, childId: number) {
	const [found] = scope.db
		.select()
		.from(schema.childPasscode)
		.where(scope.where(schema.childPasscode, eq(schema.childPasscode.childId, childId)))
		.all();
	return found ?? null;
}

const unlockFor = (scope: FamilyScope, sessionId: string, childId: number) =>
	scope.where(
		schema.childUnlock,
		eq(schema.childUnlock.sessionId, sessionId),
		eq(schema.childUnlock.childId, childId)
	);

export const hasPasscode = (scope: FamilyScope, childId: number) => row(scope, childId) !== null;

/** The ids of the family's children who have a passcode. */
export function passcodeChildIds(scope: FamilyScope) {
	const rows = scope.db
		.select({ childId: schema.childPasscode.childId })
		.from(schema.childPasscode)
		.where(scope.where(schema.childPasscode))
		.all();
	return new Set(rows.map((r) => r.childId));
}

function endUnlocks(scope: FamilyScope, childId: number) {
	scope.db
		.delete(schema.childUnlock)
		.where(scope.where(schema.childUnlock, eq(schema.childUnlock.childId, childId)))
		.run();
}

/** Set or change the pictures. Every open trip for the child closes. False if not in the family. */
export function setPasscode(scope: FamilyScope, childId: number, pictures: PictureId[]) {
	if (!scope.child(childId)) return false;
	const hash = hashPasscode(pictures);
	scope.db
		.insert(schema.childPasscode)
		.values({ childId, familyId: scope.familyId, hash })
		.onConflictDoUpdate({
			target: schema.childPasscode.childId,
			set: { hash, fails: 0, lockedUntil: null }
		})
		.run();
	endUnlocks(scope, childId);
	return true;
}

/** Turn the passcode off. False if the child is not in the family. */
export function removePasscode(scope: FamilyScope, childId: number) {
	if (!scope.child(childId)) return false;
	scope.db
		.delete(schema.childPasscode)
		.where(scope.where(schema.childPasscode, eq(schema.childPasscode.childId, childId)))
		.run();
	endUnlocks(scope, childId);
	return true;
}

/** Seconds until the next try is allowed, 0 when one is allowed now. */
export function waitSeconds(scope: FamilyScope, childId: number, now = Date.now()) {
	const until = row(scope, childId)?.lockedUntil?.getTime() ?? 0;
	return until > now ? Math.ceil((until - now) / 1000) : 0;
}

/** Check a try. The right pictures open this child's trip on this device. */
export function tryPasscode(
	scope: FamilyScope,
	sessionId: string,
	childId: number,
	pictures: PictureId[],
	now = Date.now()
): PasscodeAnswer {
	const passcode = row(scope, childId);
	if (!passcode) return { result: 'ok' };
	// Checked before the hash, so a waiting child's tries cost the server nothing.
	const seconds = waitSeconds(scope, childId, now);
	if (seconds > 0) return { result: 'wait', seconds };

	const match = eq(schema.childPasscode.childId, childId);
	if (verifyPasscode(pictures, passcode.hash)) {
		scope.db
			.update(schema.childPasscode)
			.set({ fails: 0, lockedUntil: null })
			.where(scope.where(schema.childPasscode, match))
			.run();
		scope.db
			.delete(schema.childUnlock)
			.where(scope.where(schema.childUnlock, lte(schema.childUnlock.expiresAt, new Date(now))))
			.run();
		const expiresAt = new Date(now + OPEN_MS);
		scope.db
			.insert(schema.childUnlock)
			.values({ sessionId, childId, familyId: scope.familyId, expiresAt })
			.onConflictDoUpdate({
				target: [schema.childUnlock.sessionId, schema.childUnlock.childId],
				set: { expiresAt }
			})
			.run();
		return { result: 'ok' };
	}

	const fails = passcode.fails + 1;
	const waiting = fails >= WRONG_BEFORE_WAIT;
	scope.db
		.update(schema.childPasscode)
		.set({
			fails: waiting ? 0 : fails,
			lockedUntil: waiting ? new Date(now + WAIT_MS) : null
		})
		.where(scope.where(schema.childPasscode, match))
		.run();
	return waiting ? { result: 'wait', seconds: WAIT_MS / 1000 } : { result: 'wrong' };
}

/**
 * May this device open the child's trip? True with no passcode, or while the
 * trip is open; each use keeps it open. Another family's child is true here
 * because the trip's own check answers 404 for it.
 */
export function tripOpen(scope: FamilyScope, sessionId: string, childId: number, now = Date.now()) {
	if (!row(scope, childId)) return true;
	const opened = scope.db
		.update(schema.childUnlock)
		.set({ expiresAt: new Date(now + OPEN_MS) })
		.where(
			and(unlockFor(scope, sessionId, childId), gt(schema.childUnlock.expiresAt, new Date(now)))
		)
		.run();
	return opened.changes > 0;
}

/** Back on Who's flying: every trip opened on this device closes. */
export function closeTrips(scope: FamilyScope, sessionId: string) {
	const ids = [...passcodeChildIds(scope)];
	if (ids.length === 0) return;
	scope.db
		.delete(schema.childUnlock)
		.where(
			scope.where(
				schema.childUnlock,
				eq(schema.childUnlock.sessionId, sessionId),
				inArray(schema.childUnlock.childId, ids)
			)
		)
		.run();
}
