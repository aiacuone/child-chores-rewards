// The star ledger (ADR 0003). A child's balance is the sum of their rows, and
// nothing changes it except adding, deleting or moving rows here.
import { and, desc, eq, sum } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { rankFor } from '../ranks';

export type StarKind = 'chore' | 'bonus' | 'reward';

const sign: Record<StarKind, 1 | -1> = { chore: 1, bonus: 1, reward: -1 };

/**
 * Record a star change for a child in this family. `amount` is the number of
 * stars as a whole positive number; rewards are stored as a negative amount.
 */
export function addStars(
	scope: FamilyScope,
	e: { childId: number; kind: StarKind; amount: number; sourceId?: number | null }
) {
	if (!Number.isSafeInteger(e.amount) || e.amount <= 0) throw new Error('amount must be a whole number above 0');
	scope.requireChild(e.childId);
	const [row] = scope.db
		.insert(schema.starEvent)
		.values({
			familyId: scope.familyId,
			childId: e.childId,
			kind: e.kind,
			amount: sign[e.kind] * e.amount,
			sourceId: e.sourceId ?? null
		})
		.returning()
		.all();
	return row;
}

/** The child's current balance. Ranks use this, so a rank can drop after a reward. */
export function balance(scope: FamilyScope, childId: number) {
	scope.requireChild(childId);
	const [row] = scope.db
		.select({ total: sum(schema.starEvent.amount) })
		.from(schema.starEvent)
		.where(scope.where(schema.starEvent, eq(schema.starEvent.childId, childId)))
		.all();
	return Number(row.total ?? 0);
}

/** The child's balance with their rank. */
export function standing(scope: FamilyScope, childId: number) {
	const stars = balance(scope, childId);
	return { stars, ...rankFor(stars) };
}

/** Every row for the child, newest first, for the grown-ups' star history. */
export function history(scope: FamilyScope, childId: number) {
	scope.requireChild(childId);
	return scope.db
		.select()
		.from(schema.starEvent)
		.where(scope.where(schema.starEvent, eq(schema.starEvent.childId, childId)))
		.orderBy(desc(schema.starEvent.createdAt), desc(schema.starEvent.id))
		.all();
}

const bySource = (scope: FamilyScope, kind: StarKind, sourceId: number) =>
	scope.where(schema.starEvent, and(eq(schema.starEvent.kind, kind), eq(schema.starEvent.sourceId, sourceId)));

/** Undo: delete the rows that came from one source. Returns how many went. */
export function removeStars(scope: FamilyScope, kind: StarKind, sourceId: number) {
	return scope.db.delete(schema.starEvent).where(bySource(scope, kind, sourceId)).run().changes;
}

/** "That wasn't Mia": move the rows from one source to another child in the family. */
export function moveStars(scope: FamilyScope, kind: StarKind, sourceId: number, toChildId: number) {
	scope.requireChild(toChildId);
	return scope.db
		.update(schema.starEvent)
		.set({ childId: toChildId })
		.where(bySource(scope, kind, sourceId))
		.run().changes;
}
