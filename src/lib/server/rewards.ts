// The rewards library (docs/SPEC.md, "Rewards"). A reward belongs to the
// family and is for the children picked on it; each of them gets a meter
// showing their stars against its cost. Every function takes the family scope,
// so one family never reaches another's rewards.
import { photoUrl, photoUrls } from './photos';
import { and, eq, inArray } from 'drizzle-orm';
import { schema } from './db';
import { NotInFamily, type FamilyScope } from './family';
import type { RewardInput } from './forms/rewards';
import { waitingClaims } from './claims';
import { balance } from './stars';
import { colourValue } from '../colours';
import { meter, type ChildReward, type RewardSummary } from '../rewards';

type Tx = Parameters<Parameters<FamilyScope['db']['transaction']>[0]>[0];

const firstWaiting = (waiting: ReturnType<typeof waitingClaims>, rewardId: number) => {
	const claim = waiting.find((w) => w.rewardId === rewardId);
	return claim ? { claimId: claim.claimId } : null;
};

/** Every reward in the family, oldest first (new ones go at the end), with a meter per child. */
export function listRewards(scope: FamilyScope): RewardSummary[] {
	const rewards = scope.db
		.select()
		.from(schema.reward)
		.where(scope.where(schema.reward))
		.orderBy(schema.reward.id)
		.all();
	const links = scope.db
		.select({ rewardId: schema.rewardChild.rewardId, childId: schema.rewardChild.childId })
		.from(schema.rewardChild)
		.where(scope.where(schema.rewardChild))
		.all();
	const kids = scope.children();
	const stars = new Map(kids.map((c) => [c.id, balance(scope, c.id)]));
	const waiting = waitingClaims(scope);
	const photos = photoUrls(scope, 'reward');
	return rewards.map((r) => ({
		id: r.id,
		name: r.name,
		cost: r.cost,
		colour: r.colour,
		photo: photos.get(r.id) ?? null,
		children: kids
			.filter((c) => links.some((l) => l.rewardId === r.id && l.childId === c.id))
			.map((c) => ({
				id: c.id,
				name: c.name,
				colour: colourValue(c.colour),
				stars: stars.get(c.id) ?? 0
			})),
		waiting: firstWaiting(waiting, r.id)
	}));
}

/** One reward as the form edits it, or null when it is not in this family. */
export function getReward(scope: FamilyScope, rewardId: number) {
	if (!Number.isSafeInteger(rewardId) || rewardId <= 0) return null;
	const [r] = scope.db
		.select()
		.from(schema.reward)
		.where(scope.where(schema.reward, eq(schema.reward.id, rewardId)))
		.all();
	if (!r) return null;
	const childIds = scope.db
		.select({ childId: schema.rewardChild.childId })
		.from(schema.rewardChild)
		.where(scope.where(schema.rewardChild, eq(schema.rewardChild.rewardId, rewardId)))
		.orderBy(schema.rewardChild.childId)
		.all()
		.map((l) => l.childId);
	return {
		id: r.id,
		name: r.name,
		cost: r.cost,
		colour: r.colour,
		photo: photoUrl(scope, 'reward', r.id),
		childIds
	};
}

function checkChildren(scope: FamilyScope, childIds: number[]) {
	for (const id of childIds) scope.requireChild(id);
}

/** Make the reward for exactly these children: add missing links, remove the others. */
function assign(scope: FamilyScope, db: Tx, rewardId: number, childIds: number[]) {
	const have = db
		.select({ childId: schema.rewardChild.childId })
		.from(schema.rewardChild)
		.where(scope.where(schema.rewardChild, eq(schema.rewardChild.rewardId, rewardId)))
		.all()
		.map((l) => l.childId);
	const drop = have.filter((id) => !childIds.includes(id));
	if (drop.length)
		db.delete(schema.rewardChild)
			.where(
				scope.where(
					schema.rewardChild,
					and(eq(schema.rewardChild.rewardId, rewardId), inArray(schema.rewardChild.childId, drop))
				)
			)
			.run();
	for (const childId of childIds.filter((id) => !have.includes(id)))
		db.insert(schema.rewardChild).values({ familyId: scope.familyId, rewardId, childId }).run();
}

export function addReward(scope: FamilyScope, input: RewardInput) {
	checkChildren(scope, input.childIds);
	return scope.db.transaction((tx) => {
		const [r] = tx
			.insert(schema.reward)
			.values({
				familyId: scope.familyId,
				name: input.name,
				cost: input.cost,
				colour: input.colour
			})
			.returning({ id: schema.reward.id })
			.all();
		assign(scope, tx, r.id, input.childIds);
		return r.id;
	});
}

/** Change a reward and who it is for. False when it is not in this family. */
export function updateReward(scope: FamilyScope, rewardId: number, input: RewardInput) {
	checkChildren(scope, input.childIds);
	return scope.db.transaction((tx) => {
		const mine = scope.where(schema.reward, eq(schema.reward.id, rewardId));
		const changed = tx
			.update(schema.reward)
			.set({ name: input.name, cost: input.cost, colour: input.colour })
			.where(mine)
			.run().changes;
		if (changed !== 1) return false;
		assign(scope, tx, rewardId, input.childIds);
		return true;
	});
}

/** Remove a reward and who it was for. Children's stars are not touched. */
export function removeReward(scope: FamilyScope, rewardId: number) {
	return (
		scope.db
			.delete(schema.reward)
			.where(scope.where(schema.reward, eq(schema.reward.id, rewardId)))
			.run().changes === 1
	);
}

/**
 * A child's My rewards: the rewards that are for them, ready ones first, then
 * the closest to ready, then the cheapest.
 */
export function childRewards(scope: FamilyScope, childId: number): ChildReward[] {
	const stars = balance(scope, childId);
	const asked = new Set(
		waitingClaims(scope)
			.filter((w) => w.childId === childId)
			.map((w) => w.rewardId)
	);
	const photos = photoUrls(scope, 'reward');
	return scope.db
		.select({
			id: schema.reward.id,
			name: schema.reward.name,
			cost: schema.reward.cost,
			colour: schema.reward.colour
		})
		.from(schema.rewardChild)
		.innerJoin(schema.reward, eq(schema.reward.id, schema.rewardChild.rewardId))
		.where(
			and(
				scope.where(schema.rewardChild, eq(schema.rewardChild.childId, childId)),
				eq(schema.reward.familyId, scope.familyId)
			)
		)
		.all()
		.map((r) => ({ ...r, photo: photos.get(r.id) ?? null, stars, asked: asked.has(r.id) }))
		.sort((a, b) => {
			const ma = meter(stars, a.cost);
			const mb = meter(stars, b.cost);
			return (
				Number(mb.ready) - Number(ma.ready) || ma.toGo - mb.toGo || a.cost - b.cost || a.id - b.id
			);
		});
}

/**
 * The dearest reward the child can afford, for Mission control's "reached Park
 * trip" (decided in #26). Null when they cannot afford any.
 */
export function reachedReward(scope: FamilyScope, childId: number) {
	const reached = childRewards(scope, childId).filter((r) => meter(r.stars, r.cost).ready);
	return reached.sort((a, b) => b.cost - a.cost || a.id - b.id)[0] ?? null;
}

export { NotInFamily };
