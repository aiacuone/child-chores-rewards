// Forgot PIN (docs/SPEC.md, "Grown-up mode and PIN"; ADR 0007, ADR 0008). A
// one-time 6-digit code goes to the confirmed recovery email and leads to a new
// PIN. The PIN itself is never emailed, and only a hash of the code is stored.
//
// A code has a million values, so guessing is limited three ways: 5 wrong tries
// cancel it, it lasts 15 minutes, and a family can send 5 codes an hour.
import { randomInt } from 'node:crypto';
import { and, count, desc, eq, gt, isNull } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { hashPin, hashResetCode, verifyResetCode } from './pin';

export const CODE_MINUTES = 15;
export const CODE_LIFETIME = CODE_MINUTES * 60 * 1000;
export const WRONG_TRIES = 5;
export const CODES_PER_HOUR = 5;

export class TooManyCodes extends Error {}

/** Whether the family has a PIN and where a code would go. */
export function resetTarget(scope: FamilyScope) {
	const [row] = scope.db
		.select({ pinHash: schema.family.pinHash, email: schema.family.recoveryEmail })
		.from(schema.family)
		.where(eq(schema.family.id, scope.familyId))
		.all();
	return { hasPin: !!row?.pinHash, email: row?.email ?? null };
}

/** Make a new code, cancelling any open one. Send the email after this. */
export function startReset(scope: FamilyScope, now = Date.now()) {
	return scope.db.transaction((tx) => {
		const [sent] = tx
			.select({ n: count() })
			.from(schema.pinReset)
			.where(scope.where(schema.pinReset, gt(schema.pinReset.createdAt, new Date(now - 3600_000))))
			.all();
		if (sent.n >= CODES_PER_HOUR) throw new TooManyCodes();
		tx.update(schema.pinReset)
			.set({ cancelledAt: new Date(now) })
			.where(
				scope.where(
					schema.pinReset,
					and(isNull(schema.pinReset.usedAt), isNull(schema.pinReset.cancelledAt))
				)
			)
			.run();
		const code = String(randomInt(1_000_000)).padStart(6, '0');
		const [row] = tx
			.insert(schema.pinReset)
			.values({
				familyId: scope.familyId,
				codeHash: hashResetCode(code),
				expiresAt: new Date(now + CODE_LIFETIME),
				createdAt: new Date(now)
			})
			.returning({ id: schema.pinReset.id })
			.all();
		return { code, id: row.id };
	});
}

/** Remove a code whose email could not be sent, so it neither works nor counts as sent. */
export function dropCode(scope: FamilyScope, id: number) {
	scope.db
		.delete(schema.pinReset)
		.where(scope.where(schema.pinReset, eq(schema.pinReset.id, id)))
		.run();
}

function newestCode(db: Pick<FamilyScope['db'], 'select'>, scope: FamilyScope) {
	const [row] = db
		.select()
		.from(schema.pinReset)
		.where(scope.where(schema.pinReset))
		.orderBy(desc(schema.pinReset.id))
		.limit(1)
		.all();
	return row ?? null;
}

const isOpen = (row: typeof schema.pinReset.$inferSelect, now: number) =>
	!row.usedAt && !row.cancelledAt && row.expiresAt.getTime() > now;

/** For the Set a new PIN page: a code to enter, one that ended, or nothing sent. */
export function resetState(scope: FamilyScope, now = Date.now()) {
	const row = newestCode(scope.db, scope);
	if (!row || row.usedAt) return 'none' as const;
	return isOpen(row, now) ? ('open' as const) : ('cancelled' as const);
}

/**
 * Use a code to set a new PIN. The right code changes the PIN, clears the pad's
 * lock and ends every grown-up session, so a device left unlocked under the old
 * PIN has to enter the new one. The fifth wrong code cancels it.
 */
export function useResetCode(scope: FamilyScope, code: string, newPin: string, now = Date.now()) {
	return scope.db.transaction((tx) => {
		const row = newestCode(tx, scope);
		if (!row || !isOpen(row, now)) return 'cancelled' as const;
		const mine = scope.where(schema.pinReset, eq(schema.pinReset.id, row.id));
		if (!verifyResetCode(code, row.codeHash)) {
			const wrongTries = row.wrongTries + 1;
			const cancelled = wrongTries >= WRONG_TRIES;
			tx.update(schema.pinReset)
				.set({ wrongTries, cancelledAt: cancelled ? new Date(now) : null })
				.where(mine)
				.run();
			return cancelled ? ('cancelled' as const) : ('wrong' as const);
		}
		tx.update(schema.pinReset)
			.set({ usedAt: new Date(now) })
			.where(mine)
			.run();
		tx.update(schema.family)
			.set({ pinHash: hashPin(newPin), pinFails: 0, pinLockStage: 0, pinLockedUntil: null })
			.where(eq(schema.family.id, scope.familyId))
			.run();
		tx.delete(schema.grownupToken).where(scope.where(schema.grownupToken)).run();
		return 'ok' as const;
	});
}
