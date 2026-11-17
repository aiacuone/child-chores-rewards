// The chores library (docs/SPEC.md, "Chores"). A chore belongs to the family;
// each child it is assigned to gets their own copy with its own status. Every
// function takes the family scope, so one family never reaches another's chores.
import { and, eq, inArray } from 'drizzle-orm';
import { schema } from './db';
import { NotInFamily, type FamilyScope } from './family';
import type { ChoreInput } from './forms/chores';
import { choreDay, daysBetween, REPEAT_LIMITS, type Repeat } from '../repeat';

/** A Once date outside the coming week (and not the chore's saved date). */
export class BadRepeat extends Error {}

type ChoreRowDb = typeof schema.chore.$inferSelect;
type Tx = Parameters<Parameters<FamilyScope['db']['transaction']>[0]>[0];

export type ChoreSummary = {
	id: number;
	name: string;
	icon: ChoreInput['icon'];
	stars: number;
	expectations: string;
	repeat: Repeat;
	childIds: number[];
};

/** The repeat stored in a chore row's columns. */
export function toRepeat(c: ChoreRowDb): Repeat {
	switch (c.repeatKind) {
		case 'weekly':
			return {
				kind: 'weekly',
				days: [0, 1, 2, 3, 4, 5, 6].filter((d) => (c.repeatDays! >> d) & 1)
			};
		case 'monthly':
			return { kind: 'monthly', day: c.repeatDay! };
		case 'custom':
			return { kind: 'custom', every: c.repeatEvery!, unit: c.repeatUnit!, start: c.repeatDate! };
		case 'once':
			return { kind: 'once', date: c.repeatDate! };
		default:
			return { kind: 'daily' };
	}
}

function repeatColumns(r: Repeat) {
	return {
		repeatKind: r.kind,
		repeatDays: r.kind === 'weekly' ? r.days.reduce((bits, d) => bits | (1 << d), 0) : null,
		repeatDay: r.kind === 'monthly' ? r.day : null,
		repeatEvery: r.kind === 'custom' ? r.every : null,
		repeatUnit: r.kind === 'custom' ? r.unit : null,
		repeatDate: r.kind === 'custom' ? r.start : r.kind === 'once' ? r.date : null
	};
}

/**
 * The repeat to save. Custom counts from today, unless only other fields
 * changed, so editing a chore's name does not move its days. A Once date must
 * be today or in the next 6 days, or stay the date it already had.
 */
function savedRepeat(input: ChoreInput['repeat'], today: string, old: Repeat | null): Repeat {
	if (input.kind === 'custom') {
		const same = old?.kind === 'custom' && old.every === input.every && old.unit === input.unit;
		return { ...input, start: same ? old.start : today };
	}
	if (input.kind === 'once') {
		const ahead = daysBetween(today, input.date);
		const kept = old?.kind === 'once' && old.date === input.date;
		if (!kept && (ahead < 0 || ahead >= REPEAT_LIMITS.onceDays)) throw new BadRepeat();
	}
	return input;
}

/** Every chore in the family, newest first, with who it is assigned to. */
export function listChores(scope: FamilyScope): ChoreSummary[] {
	const chores = scope.db
		.select()
		.from(schema.chore)
		.where(scope.where(schema.chore))
		.orderBy(schema.chore.id)
		.all();
	const copies = scope.db
		.select({ choreId: schema.choreCopy.choreId, childId: schema.choreCopy.childId })
		.from(schema.choreCopy)
		.where(scope.where(schema.choreCopy))
		.orderBy(schema.choreCopy.childId)
		.all();
	return chores.reverse().map((c) => ({
		id: c.id,
		name: c.name,
		icon: c.icon,
		stars: c.stars,
		expectations: c.expectations,
		repeat: toRepeat(c),
		childIds: copies.filter((k) => k.choreId === c.id).map((k) => k.childId)
	}));
}

/** One chore with each child's copy, or null when it is not in this family. */
export function getChore(scope: FamilyScope, choreId: number) {
	if (!Number.isSafeInteger(choreId) || choreId <= 0) return null;
	const [c] = scope.db
		.select()
		.from(schema.chore)
		.where(scope.where(schema.chore, eq(schema.chore.id, choreId)))
		.all();
	if (!c) return null;
	const copies = scope.db
		.select({ childId: schema.choreCopy.childId, status: schema.choreCopy.status })
		.from(schema.choreCopy)
		.where(scope.where(schema.choreCopy, eq(schema.choreCopy.choreId, choreId)))
		.orderBy(schema.choreCopy.childId)
		.all();
	return {
		id: c.id,
		name: c.name,
		icon: c.icon,
		stars: c.stars,
		expectations: c.expectations,
		repeat: toRepeat(c),
		childIds: copies.map((k) => k.childId),
		copies
	};
}

function checkChildren(scope: FamilyScope, childIds: number[]) {
	for (const id of childIds) scope.requireChild(id);
}

/** Give exactly these children a copy: add missing copies, remove the others. */
function assign(scope: FamilyScope, db: Tx, choreId: number, childIds: number[]) {
	const have = db
		.select({ childId: schema.choreCopy.childId })
		.from(schema.choreCopy)
		.where(scope.where(schema.choreCopy, eq(schema.choreCopy.choreId, choreId)))
		.all()
		.map((k) => k.childId);
	const drop = have.filter((id) => !childIds.includes(id));
	if (drop.length)
		db.delete(schema.choreCopy)
			.where(
				scope.where(
					schema.choreCopy,
					and(eq(schema.choreCopy.choreId, choreId), inArray(schema.choreCopy.childId, drop))
				)
			)
			.run();
	for (const childId of childIds.filter((id) => !have.includes(id)))
		db.insert(schema.choreCopy).values({ familyId: scope.familyId, choreId, childId }).run();
}

export function addChore(scope: FamilyScope, input: ChoreInput, now = new Date()) {
	checkChildren(scope, input.childIds);
	const repeat = savedRepeat(input.repeat, choreDay(now), null);
	return scope.db.transaction((tx) => {
		const [c] = tx
			.insert(schema.chore)
			.values({
				familyId: scope.familyId,
				name: input.name,
				icon: input.icon,
				stars: input.stars,
				expectations: input.expectations,
				...repeatColumns(repeat)
			})
			.returning({ id: schema.chore.id })
			.all();
		assign(scope, tx, c.id, input.childIds);
		return c.id;
	});
}

/** Change a chore and who does it. False when it is not in this family. */
export function updateChore(
	scope: FamilyScope,
	choreId: number,
	input: ChoreInput,
	now = new Date()
) {
	checkChildren(scope, input.childIds);
	return scope.db.transaction((tx) => {
		const mine = scope.where(schema.chore, eq(schema.chore.id, choreId));
		const [old] = tx.select().from(schema.chore).where(mine).all();
		if (!old) return false;
		const repeat = savedRepeat(input.repeat, choreDay(now), toRepeat(old));
		tx.update(schema.chore)
			.set({
				name: input.name,
				icon: input.icon,
				stars: input.stars,
				expectations: input.expectations,
				...repeatColumns(repeat)
			})
			.where(mine)
			.run();
		assign(scope, tx, choreId, input.childIds);
		return true;
	});
}

/**
 * Remove a chore and every child's copy. Stars already earned from it stay:
 * star rows keep their amount, and their source_id is not a foreign key.
 */
export function removeChore(scope: FamilyScope, choreId: number) {
	return (
		scope.db
			.delete(schema.chore)
			.where(scope.where(schema.chore, eq(schema.chore.id, choreId)))
			.run().changes === 1
	);
}

export { NotInFamily };
