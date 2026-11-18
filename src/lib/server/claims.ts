// Reward claims (docs/SPEC.md, "Rewards"; ADR 0003, ADR 0009). A child asks for
// a reward they have enough stars for; it waits for a grown-up, who hands it
// out (the stars are taken then, as one star_event row of kind 'reward') or
// declines it with a kind message. Stars are never taken at the claim, and never
// go below 0. Only the signed-in family's rows are read or changed.
import { photoUrl } from './photos';
import { and, asc, desc, eq, isNotNull, isNull, lte } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { addStars, balance } from './stars';
import { colourValue } from '../colours';

/** One claim with its reward and child, both in this family. */
function claimRows(scope: FamilyScope, ...more: Parameters<FamilyScope['where']>[1][]) {
	return scope.db
		.select({ claim: schema.rewardClaim, reward: schema.reward, child: schema.child })
		.from(schema.rewardClaim)
		.innerJoin(schema.reward, eq(schema.reward.id, schema.rewardClaim.rewardId))
		.innerJoin(schema.child, eq(schema.child.id, schema.rewardClaim.childId))
		.where(
			and(
				scope.where(schema.rewardClaim, ...more),
				eq(schema.reward.familyId, scope.familyId),
				eq(schema.child.familyId, scope.familyId)
			)
		);
}

const findClaim = (scope: FamilyScope, claimId: number) => {
	if (!Number.isSafeInteger(claimId) || claimId <= 0) return null;
	return claimRows(scope, eq(schema.rewardClaim.id, claimId)).all()[0] ?? null;
};

/**
 * "Claim": the child asks for a reward. It must be for them, they must have
 * enough stars, and a second tap while one is waiting changes nothing.
 * Returns the claim's id and whether it is new (so only a new one sends an
 * alert), or null when the child may not claim it.
 */
export function claimReward(scope: FamilyScope, childId: number, rewardId: number) {
	if (!Number.isSafeInteger(rewardId) || rewardId <= 0) return null;
	if (!scope.child(childId)) return null;
	return scope.db.transaction((tx) => {
		const [row] = tx
			.select({ cost: schema.reward.cost })
			.from(schema.rewardChild)
			.innerJoin(schema.reward, eq(schema.reward.id, schema.rewardChild.rewardId))
			.where(
				and(
					scope.where(
						schema.rewardChild,
						eq(schema.rewardChild.rewardId, rewardId),
						eq(schema.rewardChild.childId, childId)
					),
					eq(schema.reward.familyId, scope.familyId)
				)
			)
			.all();
		if (!row || balance(scope, childId) < row.cost) return null;
		const [made] = tx
			.insert(schema.rewardClaim)
			.values({ familyId: scope.familyId, rewardId, childId })
			.onConflictDoNothing()
			.returning({ id: schema.rewardClaim.id })
			.all();
		if (made) return { id: made.id, isNew: true };
		const [open] = tx
			.select({ id: schema.rewardClaim.id })
			.from(schema.rewardClaim)
			.where(
				scope.where(
					schema.rewardClaim,
					eq(schema.rewardClaim.rewardId, rewardId),
					eq(schema.rewardClaim.childId, childId),
					eq(schema.rewardClaim.status, 'waiting')
				)
			)
			.all();
		return open ? { id: open.id, isNew: false } : null;
	});
}

/** The child's waiting claim for a reward, for "Asked a grown-up!". */
export function waitingClaim(scope: FamilyScope, childId: number, rewardId: number) {
	const [row] = claimRows(
		scope,
		eq(schema.rewardClaim.childId, childId),
		eq(schema.rewardClaim.rewardId, rewardId),
		eq(schema.rewardClaim.status, 'waiting')
	).all();
	return row ? { id: row.claim.id, rewardName: row.reward.name } : null;
}

/** Claims waiting for a grown-up, oldest first (Mission control, the Rewards tab). */
export function waitingClaims(scope: FamilyScope) {
	return claimRows(scope, eq(schema.rewardClaim.status, 'waiting'))
		.orderBy(asc(schema.rewardClaim.id))
		.all()
		.map(({ claim, reward, child }) => ({
			claimId: claim.id,
			rewardId: reward.id,
			rewardName: reward.name,
			childId: child.id,
			childName: child.name
		}));
}

/** One claim for the hand-out pages and the notices after them. */
export function claimDetails(scope: FamilyScope, claimId: number) {
	const row = findClaim(scope, claimId);
	if (!row) return null;
	const { claim, reward, child } = row;
	return {
		claimId: claim.id,
		status: claim.status,
		message: claim.message,
		reward: {
			id: reward.id,
			name: reward.name,
			cost: reward.cost,
			colour: reward.colour,
			photo: photoUrl(scope, 'reward', reward.id)
		},
		child: { id: child.id, name: child.name, colour: colourValue(child.colour) },
		/** The child's stars now. After a hand-out, what they have left. */
		stars: balance(scope, child.id)
	};
}

export type ClaimDetails = NonNullable<ReturnType<typeof claimDetails>>;

/**
 * "Yes, I handed it out": the reward's cost comes off the child's stars as one
 * row, and the claim is closed. Refused with 'short' when their stars are below
 * the cost now (for example after a chore was undone), so stars never go below
 * 0; 'gone' when it is not waiting (another grown-up answered it first).
 */
export function handOut(scope: FamilyScope, claimId: number, now = new Date()) {
	return scope.db.transaction((): 'ok' | 'short' | 'gone' => {
		const row = findClaim(scope, claimId);
		if (!row || row.claim.status !== 'waiting') return 'gone';
		const cost = row.reward.cost;
		if (balance(scope, row.child.id) < cost) return 'short';
		addStars(scope, { childId: row.child.id, kind: 'reward', amount: cost, sourceId: claimId });
		scope.db
			.update(schema.rewardClaim)
			.set({ status: 'handed_out', stars: cost, resolvedAt: now })
			.where(scope.where(schema.rewardClaim, eq(schema.rewardClaim.id, claimId)))
			.run();
		return 'ok';
	});
}

/**
 * "Not now": the claim is closed with the grown-up's message. No stars move,
 * and the child can ask again. The message must already be checked
 * (forms/claims.ts). False when it is not waiting.
 */
export function decline(scope: FamilyScope, claimId: number, message: string, now = new Date()) {
	return scope.db.transaction(() => {
		const row = findClaim(scope, claimId);
		if (!row || row.claim.status !== 'waiting') return false;
		scope.db
			.update(schema.rewardClaim)
			.set({ status: 'declined', message, resolvedAt: now })
			.where(scope.where(schema.rewardClaim, eq(schema.rewardClaim.id, claimId)))
			.run();
		return true;
	});
}

/**
 * What the child has not seen yet on My rewards: the newest answered claim, as
 * "handed out!" or "Grown-up says: …". Reading changes nothing; the page calls
 * `clearClaimNotices` once it is on screen, so a preloaded page that is never
 * opened does not use it up.
 */
export function claimNotice(scope: FamilyScope, childId: number) {
	const [row] = claimRows(
		scope,
		eq(schema.rewardClaim.childId, childId),
		isNotNull(schema.rewardClaim.resolvedAt),
		isNull(schema.rewardClaim.seenAt)
	)
		.orderBy(desc(schema.rewardClaim.id))
		.limit(1)
		.all();
	if (!row) return null;
	return {
		id: row.claim.id,
		kind: row.claim.status === 'handed_out' ? ('handed_out' as const) : ('declined' as const),
		rewardName: row.reward.name,
		stars: row.claim.stars,
		message: row.claim.message
	};
}

/** The child has seen the answers: mark theirs, up to that one, as seen. */
export function clearClaimNotices(
	scope: FamilyScope,
	childId: number,
	upToId: number,
	now = new Date()
) {
	return scope.db
		.update(schema.rewardClaim)
		.set({ seenAt: now })
		.where(
			scope.where(
				schema.rewardClaim,
				eq(schema.rewardClaim.childId, childId),
				isNotNull(schema.rewardClaim.resolvedAt),
				isNull(schema.rewardClaim.seenAt),
				lte(schema.rewardClaim.id, upToId)
			)
		)
		.run().changes;
}
