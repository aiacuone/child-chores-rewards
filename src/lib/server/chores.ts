// The chores library (docs/SPEC.md, "Chores"). A chore belongs to the family;
// each child it is assigned to gets their own copy with its own status. Every
// function takes the family scope, so one family never reaches another's chores.
import { and, eq, inArray } from 'drizzle-orm';
import { schema } from './db';
import { NotInFamily, type FamilyScope } from './family';
import type { ChoreInput } from './forms/chores';

type Tx = Parameters<Parameters<FamilyScope['db']['transaction']>[0]>[0];

export type ChoreSummary = {
	id: number;
	name: string;
	icon: ChoreInput['icon'];
	stars: number;
	childIds: number[];
};

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

export function addChore(scope: FamilyScope, input: ChoreInput) {
	checkChildren(scope, input.childIds);
	return scope.db.transaction((tx) => {
		const [c] = tx
			.insert(schema.chore)
			.values({ familyId: scope.familyId, name: input.name, icon: input.icon, stars: input.stars })
			.returning({ id: schema.chore.id })
			.all();
		assign(scope, tx, c.id, input.childIds);
		return c.id;
	});
}

/** Change a chore and who does it. False when it is not in this family. */
export function updateChore(scope: FamilyScope, choreId: number, input: ChoreInput) {
	checkChildren(scope, input.childIds);
	return scope.db.transaction((tx) => {
		const changed = tx
			.update(schema.chore)
			.set({ name: input.name, icon: input.icon, stars: input.stars })
			.where(scope.where(schema.chore, eq(schema.chore.id, choreId)))
			.run().changes;
		if (changed !== 1) return false;
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
