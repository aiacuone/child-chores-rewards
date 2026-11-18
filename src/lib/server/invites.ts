// Grown-ups and invites (ADR 0017, docs/how-it-works/grown-ups.md). An invite
// holds a Google email; signing in with that verified email joins the family.
import { and, count, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { maskEmail } from '../mask';
import { schema, type Db } from './db';
import { EmailNotSent, sendEmail } from './email';
import type { FamilyScope } from './family';
import type { GoogleProfile, SignedInUser } from './auth';

const DAY = 24 * 60 * 60 * 1000;
export const INVITE_DAYS = 7;
export const INVITES_PER_HOUR = 5;

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Writer = Pick<Db, 'update'>;

const unused = and(isNull(schema.invite.acceptedAt), isNull(schema.invite.cancelledAt));

/** Screens showing grown-ups refresh when this family's list changes. */
function bumpVersion(db: Writer, familyId: number) {
	db.update(schema.family)
		.set({ version: sql`${schema.family.version} + 1` })
		.where(eq(schema.family.id, familyId))
		.run();
}

export function familyGrownUps(scope: FamilyScope) {
	return scope.db
		.select()
		.from(schema.user)
		.where(scope.where(schema.user))
		.orderBy(schema.user.id)
		.all();
}

/** What the Grown-ups screen shows. Emails are masked, as drawn. */
export function grownUpsView(scope: FamilyScope, viewer: SignedInUser, now = Date.now()) {
	const invites = scope.db
		.select()
		.from(schema.invite)
		.where(scope.where(schema.invite, unused))
		.orderBy(schema.invite.id)
		.all();
	const isOwner = viewer.role === 'owner';
	return {
		people: familyGrownUps(scope).map((u) => ({
			id: u.id,
			name: u.name,
			email: maskEmail(u.email),
			you: u.id === viewer.id,
			owner: u.role === 'owner',
			canRemove: isOwner && u.role !== 'owner'
		})),
		invites: invites.map((i) => ({
			id: i.id,
			name: i.email.slice(0, i.email.lastIndexOf('@')),
			email: maskEmail(i.email),
			expired: i.expiresAt.getTime() <= now
		}))
	};
}

type Started = { id: number } | 'joined' | 'tooMany';

/** Record an invite, replacing any earlier one for the address. Send the email after this. */
export function startInvite(scope: FamilyScope, rawEmail: string, now = Date.now()): Started {
	const email = rawEmail.toLowerCase();
	return scope.db.transaction((tx) => {
		const [existing] = tx
			.select({ id: schema.user.id })
			.from(schema.user)
			.where(sql`lower(${schema.user.email}) = ${email}`)
			.all();
		if (existing) return 'joined';

		const [sent] = tx
			.select({ n: count() })
			.from(schema.invite)
			.where(scope.where(schema.invite, gt(schema.invite.createdAt, new Date(now - 60 * 60_000))))
			.all();
		if (sent.n >= INVITES_PER_HOUR) return 'tooMany';

		tx.update(schema.invite)
			.set({ cancelledAt: new Date(now) })
			.where(scope.where(schema.invite, eq(schema.invite.email, email), unused))
			.run();
		const [row] = tx
			.insert(schema.invite)
			.values({
				familyId: scope.familyId,
				email,
				expiresAt: new Date(now + INVITE_DAYS * DAY),
				createdAt: new Date(now)
			})
			.returning({ id: schema.invite.id })
			.all();
		bumpVersion(tx, scope.familyId);
		return { id: row.id };
	});
}

/** Invite and email. An invite whose email fails is removed and does not count. */
export async function sendInvite(scope: FamilyScope, email: string, origin: string) {
	const started = startInvite(scope, email);
	if (typeof started === 'string') return started;
	try {
		await sendEmail({
			to: email,
			subject: "You're invited to Rocket Rewards",
			text: `You've been invited to help run a family's chores and rewards.\n\nOpen ${origin} and sign in with Google using this email address. Ask your family for the grown-up PIN.\n\nThe invite works for ${INVITE_DAYS} days. If you weren't expecting this, you can ignore this email.`
		});
	} catch (e) {
		if (!(e instanceof EmailNotSent)) throw e;
		scope.db
			.delete(schema.invite)
			.where(scope.where(schema.invite, eq(schema.invite.id, started.id)))
			.run();
		bumpVersion(scope.db, scope.familyId);
		return 'notSent' as const;
	}
	return 'sent' as const;
}

/** False when there is no such unused invite in this family. */
export function cancelInvite(scope: FamilyScope, id: number, now = Date.now()) {
	const done = scope.db
		.update(schema.invite)
		.set({ cancelledAt: new Date(now) })
		.where(scope.where(schema.invite, eq(schema.invite.id, id), unused))
		.run();
	if (done.changes > 0) bumpVersion(scope.db, scope.familyId);
	return done.changes > 0;
}

/**
 * The owner removes a grown-up. Deleting the account ends all their sessions
 * and grown-up tokens, and they need a new invite to come back.
 */
export function removeGrownUp(scope: FamilyScope, actor: SignedInUser, userId: number) {
	if (actor.role !== 'owner' || actor.familyId !== scope.familyId) return 'forbidden' as const;
	const [target] = scope.db
		.select()
		.from(schema.user)
		.where(scope.where(schema.user, eq(schema.user.id, userId)))
		.all();
	if (!target) return 'missing' as const;
	if (target.role === 'owner') return 'forbidden' as const;
	scope.db
		.delete(schema.user)
		.where(scope.where(schema.user, eq(schema.user.id, userId)))
		.run();
	bumpVersion(scope.db, scope.familyId);
	return 'removed' as const;
}

/** Inside sign-in: join the family with the newest working invite. Returns the new user's id. */
export function acceptInvite(tx: Tx, profile: GoogleProfile, now: number) {
	const email = profile.email.toLowerCase();
	const [open] = tx
		.select()
		.from(schema.invite)
		.where(and(eq(schema.invite.email, email), unused, gt(schema.invite.expiresAt, new Date(now))))
		.orderBy(desc(schema.invite.id))
		.limit(1)
		.all();
	if (!open) return null;
	const [user] = tx
		.insert(schema.user)
		.values({
			familyId: open.familyId,
			role: 'grownup',
			email,
			googleSub: profile.sub,
			name: profile.name
		})
		.returning({ id: schema.user.id })
		.all();
	tx.update(schema.invite)
		.set({ acceptedAt: new Date(now) })
		.where(eq(schema.invite.id, open.id))
		.run();
	bumpVersion(tx, open.familyId);
	return user.id;
}
