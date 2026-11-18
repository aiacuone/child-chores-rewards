// The grown-up check (docs/SPEC.md, "Checking, undo and send back"; ADR 0003).
// A chore a child sent with "I did it!" waits on its copy until a grown-up
// accepts it (stars added, undo for 1 minute), sends it back with a kind
// message, or gives it to the child who really did it ("That wasn't Mia").
// Every star change is one star_event row. Only the signed-in family's rows are
// read or changed.
import { and, desc, eq, lte } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { toRepeat } from './chores';
import { addStars } from './stars';
import { settleBonus, undoBonus } from './bonus';
import { colourValue } from '../colours';
import { UNDO_CHECK_SECONDS } from '../check';
import { choreDay, repeatLabel } from '../repeat';

/** The server allows undo a little longer, so a tap at 0:59 still counts. */
const UNDO_GRACE_SECONDS = 10;

/** One copy with its chore and child, both in this family. */
function copyRows(scope: FamilyScope, ...more: Parameters<FamilyScope['where']>[1][]) {
	return scope.db
		.select({ copy: schema.choreCopy, chore: schema.chore, child: schema.child })
		.from(schema.choreCopy)
		.innerJoin(schema.chore, eq(schema.chore.id, schema.choreCopy.choreId))
		.innerJoin(schema.child, eq(schema.child.id, schema.choreCopy.childId))
		.where(
			and(
				scope.where(schema.choreCopy, ...more),
				eq(schema.chore.familyId, scope.familyId),
				eq(schema.child.familyId, scope.familyId)
			)
		);
}

const findCopy = (scope: FamilyScope, copyId: number) => {
	if (!Number.isSafeInteger(copyId) || copyId <= 0) return null;
	return copyRows(scope, eq(schema.choreCopy.id, copyId)).all()[0] ?? null;
};

/** Chores waiting for a grown-up, oldest "I did it!" first (TO CHECK, Mission control). */
export function toCheck(scope: FamilyScope) {
	return copyRows(scope, eq(schema.choreCopy.status, 'waiting'))
		.orderBy(schema.choreCopy.doneAt, schema.choreCopy.id)
		.all()
		.map(({ copy, chore, child }) => ({
			copyId: copy.id,
			name: chore.name,
			icon: chore.icon,
			stars: chore.stars,
			childId: child.id,
			childName: child.name
		}));
}

/**
 * One copy for the check pages and the notices after them: the chore, who
 * marked it, when, its state, and how long undo is still allowed.
 */
export function checkDetails(scope: FamilyScope, copyId: number, now = new Date()) {
	const row = findCopy(scope, copyId);
	if (!row) return null;
	const { copy, chore, child } = row;
	const undoLeft = copy.checkedAt
		? Math.max(
				0,
				UNDO_CHECK_SECONDS - Math.floor((now.getTime() - copy.checkedAt.getTime()) / 1000)
			)
		: 0;
	return {
		copyId: copy.id,
		status: copy.status,
		doneAt: copy.doneAt?.getTime() ?? null,
		undoLeft: copy.status === 'completed' ? undoLeft : 0,
		chore: {
			id: chore.id,
			name: chore.name,
			icon: chore.icon,
			stars: chore.stars,
			repeats: repeatLabel(toRepeat(chore), choreDay(now))
		},
		child: { id: child.id, name: child.name, colour: colourValue(child.colour) }
	};
}

export type CheckDetails = NonNullable<ReturnType<typeof checkDetails>>;

/** A copy that is still waiting, for the three answers. */
const waiting = (scope: FamilyScope, copyId: number) => {
	const row = findCopy(scope, copyId);
	return row && row.copy.status === 'waiting' ? row : null;
};

/** Mark a copy done with its stars, and queue "checked!" for that child's trip. */
function complete(
	scope: FamilyScope,
	copyId: number,
	childId: number,
	stars: number,
	starEventId: number,
	now: Date
) {
	scope.db
		.update(schema.choreCopy)
		.set({ status: 'completed', checkedAt: now, starEventId, message: null })
		.where(scope.where(schema.choreCopy, eq(schema.choreCopy.id, copyId)))
		.run();
	scope.db
		.insert(schema.checkedNotice)
		.values({ familyId: scope.familyId, childId, copyId, stars })
		.run();
}

/**
 * "Yes, it's done!": the copy is completed and the child earns the chore's
 * stars as one star row. Returns false when it is not waiting any more (for
 * example another grown-up already answered).
 */
export function accept(scope: FamilyScope, copyId: number, now = new Date()) {
	return scope.db.transaction(() => {
		const row = waiting(scope, copyId);
		if (!row) return false;
		const star = addStars(scope, {
			childId: row.child.id,
			kind: 'chore',
			amount: row.chore.stars,
			sourceId: row.copy.id
		});
		complete(scope, row.copy.id, row.child.id, row.chore.stars, star.id, now);
		settleBonus(scope, row.child.id, now);
		return true;
	});
}

/**
 * Undo an accept within the minute: the star row it added goes (only that row,
 * so stars from other days or moved to another child stay), along with the
 * daily bonus if this accept finished the trip, and the chore waits for a
 * check again.
 */
export function undoAccept(scope: FamilyScope, copyId: number, now = new Date()) {
	return scope.db.transaction(() => {
		const row = findCopy(scope, copyId);
		const { copy } = row ?? {};
		if (!row || !copy || copy.status !== 'completed' || !copy.checkedAt || !copy.starEventId)
			return false;
		if (now.getTime() - copy.checkedAt.getTime() > (UNDO_CHECK_SECONDS + UNDO_GRACE_SECONDS) * 1000)
			return false;
		scope.db
			.delete(schema.starEvent)
			.where(
				scope.where(
					schema.starEvent,
					eq(schema.starEvent.id, copy.starEventId),
					eq(schema.starEvent.childId, row.child.id)
				)
			)
			.run();
		scope.db
			.update(schema.choreCopy)
			.set({ status: 'waiting', checkedAt: null, starEventId: null })
			.where(scope.where(schema.choreCopy, eq(schema.choreCopy.id, copy.id)))
			.run();
		// If this accept finished the trip, its daily bonus goes too (ADR 0003).
		undoBonus(scope, row.child.id, now);
		scope.db
			.delete(schema.checkedNotice)
			.where(scope.where(schema.checkedNotice, eq(schema.checkedNotice.copyId, copy.id)))
			.run();
		return true;
	});
}

/**
 * "Not done yet": back to the child's trip as an open stop, with the grown-up's
 * kind message. The message must already be checked (forms/check.ts).
 */
export function sendBack(scope: FamilyScope, copyId: number, message: string) {
	return scope.db.transaction(() => {
		if (!waiting(scope, copyId)) return false;
		scope.db
			.update(schema.choreCopy)
			.set({ status: 'pending', doneAt: null, message })
			.where(scope.where(schema.choreCopy, eq(schema.choreCopy.id, copyId)))
			.run();
		return true;
	});
}

/**
 * "That wasn't Mia": the stars go to the child who really did it, and the
 * marker's stop opens again on their trip. If that child has their own copy of
 * the chore, it shows Done on their trip. If not, they only get the stars: the
 * chore is not added to their trip (decided in #24). Returns false when the
 * copy is not waiting, or the child is not another child in this family.
 */
export function moveTo(scope: FamilyScope, copyId: number, toChildId: number, now = new Date()) {
	return scope.db.transaction(() => {
		const row = waiting(scope, copyId);
		if (!row || toChildId === row.child.id || !scope.child(toChildId)) return false;
		const [theirs] = scope.db
			.select()
			.from(schema.choreCopy)
			.where(
				scope.where(
					schema.choreCopy,
					eq(schema.choreCopy.choreId, row.chore.id),
					eq(schema.choreCopy.childId, toChildId)
				)
			)
			.all();
		const earnsOnCopy = theirs && theirs.status !== 'completed' ? theirs : null;
		const star = addStars(scope, {
			childId: toChildId,
			kind: 'chore',
			amount: row.chore.stars,
			sourceId: earnsOnCopy?.id ?? row.copy.id
		});
		if (earnsOnCopy) {
			complete(scope, earnsOnCopy.id, toChildId, row.chore.stars, star.id, now);
			settleBonus(scope, toChildId, now);
		}
		scope.db
			.update(schema.choreCopy)
			.set({ status: 'pending', doneAt: null })
			.where(scope.where(schema.choreCopy, eq(schema.choreCopy.id, row.copy.id)))
			.run();
		return true;
	});
}

/**
 * "Feed Biscuit the dog checked! +15 stars" for a child's trip: the newest
 * notice not yet shown, with its id. Reading it changes nothing; the trip
 * calls `clearCheckedNotices` once it is on screen, so a preloaded page that
 * is never opened does not use it up.
 */
export function checkedNotice(scope: FamilyScope, childId: number) {
	const [notice] = scope.db
		.select({
			id: schema.checkedNotice.id,
			stars: schema.checkedNotice.stars,
			name: schema.chore.name
		})
		.from(schema.checkedNotice)
		.innerJoin(schema.choreCopy, eq(schema.choreCopy.id, schema.checkedNotice.copyId))
		.innerJoin(schema.chore, eq(schema.chore.id, schema.choreCopy.choreId))
		.where(
			and(
				scope.where(schema.checkedNotice, eq(schema.checkedNotice.childId, childId)),
				eq(schema.chore.familyId, scope.familyId)
			)
		)
		.orderBy(desc(schema.checkedNotice.id))
		.limit(1)
		.all();
	return notice ?? null;
}

/** The child has seen "checked!": clear their notices up to that one. */
export function clearCheckedNotices(scope: FamilyScope, childId: number, upToId: number) {
	return scope.db
		.delete(schema.checkedNotice)
		.where(
			scope.where(
				schema.checkedNotice,
				eq(schema.checkedNotice.childId, childId),
				lte(schema.checkedNotice.id, upToId)
			)
		)
		.run().changes;
}
