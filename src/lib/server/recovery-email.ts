// The recovery email (docs/SPEC.md, "Grown-up mode and PIN"). A new address is
// used only after the confirm link in its inbox is opened and confirmed. The
// link holds a random token; only its hash is stored. Each link works once,
// for 24 hours, and a newer link cancels older ones.
import { createHash, randomBytes } from 'node:crypto';
import { and, count, eq, gt, isNull } from 'drizzle-orm';
import { schema, type Db } from './db';
import type { FamilyScope } from './family';

export const LINK_LIFETIME = 24 * 60 * 60 * 1000;
/** Links one family can send in an hour, so the app's Gmail cannot be used for spam. */
export const SENDS_PER_HOUR = 5;

export class TooManyEmails extends Error {}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const isToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);

/** Make a confirm link token for this address. Send the email after this. */
export function startVerification(scope: FamilyScope, email: string, now = Date.now()) {
	return scope.db.transaction((tx) => {
		const [sent] = tx
			.select({ n: count() })
			.from(schema.emailVerification)
			.where(
				and(
					eq(schema.emailVerification.familyId, scope.familyId),
					gt(schema.emailVerification.createdAt, new Date(now - 60 * 60 * 1000))
				)
			)
			.all();
		if (sent.n >= SENDS_PER_HOUR) throw new TooManyEmails();

		cancelOpenLinks(tx, scope.familyId, now);
		const token = randomBytes(32).toString('base64url');
		const [row] = tx
			.insert(schema.emailVerification)
			.values({
				familyId: scope.familyId,
				email,
				tokenHash: hashToken(token),
				expiresAt: new Date(now + LINK_LIFETIME),
				createdAt: new Date(now)
			})
			.returning({ id: schema.emailVerification.id })
			.all();
		return { token, id: row.id };
	});
}

/** Remove a link whose email could not be sent, so it neither works nor counts as sent. */
export function dropLink(scope: FamilyScope, id: number) {
	scope.db
		.delete(schema.emailVerification)
		.where(scope.where(schema.emailVerification, eq(schema.emailVerification.id, id)))
		.run();
}

function cancelOpenLinks(db: Pick<Db, 'update'>, familyId: number, now: number) {
	db.update(schema.emailVerification)
		.set({ usedAt: new Date(now) })
		.where(
			and(eq(schema.emailVerification.familyId, familyId), isNull(schema.emailVerification.usedAt))
		)
		.run();
}

function openLink(db: Pick<Db, 'select'>, token: unknown, now: number) {
	if (!isToken(token)) return null;
	const [row] = db
		.select()
		.from(schema.emailVerification)
		.where(eq(schema.emailVerification.tokenHash, hashToken(token)))
		.all();
	if (!row || row.usedAt || row.expiresAt.getTime() <= now) return null;
	return row;
}

/** The address a link would confirm, or null when the link is unknown, used or expired. */
export function linkEmail(db: Db, token: unknown, now = Date.now()) {
	return openLink(db, token, now)?.email ?? null;
}

/** The family's confirmed recovery email, or null. */
export function recoveryEmail(scope: FamilyScope) {
	const [row] = scope.db
		.select({ email: schema.family.recoveryEmail })
		.from(schema.family)
		.where(eq(schema.family.id, scope.familyId))
		.all();
	return row?.email ?? null;
}

/**
 * Confirm the link: its address becomes the family's recovery email, and the
 * old one stops being used only now. Null if the link no longer works.
 * `changed` is true when it replaced a different address, not on the first one.
 */
export function confirmLink(db: Db, token: unknown, now = Date.now()) {
	return db.transaction((tx) => {
		const row = openLink(tx, token, now);
		if (!row) return null;
		const [family] = tx
			.select({ email: schema.family.recoveryEmail })
			.from(schema.family)
			.where(eq(schema.family.id, row.familyId))
			.all();
		tx.update(schema.family)
			.set({ recoveryEmail: row.email })
			.where(eq(schema.family.id, row.familyId))
			.run();
		cancelOpenLinks(tx, row.familyId, now);
		return {
			familyId: row.familyId,
			changed: family.email !== null && family.email !== row.email
		};
	});
}

/** True once this family has sent at least one confirm link (setup step 3 is done). */
export function linkSent(scope: FamilyScope) {
	const [row] = scope.db
		.select({ n: count() })
		.from(schema.emailVerification)
		.where(scope.where(schema.emailVerification))
		.all();
	return row.n > 0;
}
