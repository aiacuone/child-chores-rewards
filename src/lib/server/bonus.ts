// The daily bonus (docs/SPEC.md, "Trip, stars and bonus"; ADR 0003). A child
// earns it once per chore day, when every stop on their trip that day is Done
// (accepted by a grown-up). Skipped and not-due chores are not on the trip, so
// they never block it. It is one star_event row of kind 'bonus' whose source is
// the chore day as a number (2026-11-17 is 20261117), so a day can only have one.
//
// It is only taken back when a grown-up undoes the accept that finished the
// trip. Nothing else removes it: a chore added later in the day does not take
// away a bonus already earned, because children never see a loss of stars.
import { and, eq } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { addStars } from './stars';
import { tripStops } from './trip';
import { DAILY_BONUS } from '../bonus';
import { choreDay } from '../repeat';

/** The chore day as the bonus row's source: "2026-11-17" is 20261117. */
export const bonusSource = (day: string) => Number(day.replaceAll('-', ''));

function bonusRow(scope: FamilyScope, childId: number, day: string) {
	const [row] = scope.db
		.select()
		.from(schema.starEvent)
		.where(
			scope.where(
				schema.starEvent,
				and(
					eq(schema.starEvent.childId, childId),
					eq(schema.starEvent.kind, 'bonus'),
					eq(schema.starEvent.sourceId, bonusSource(day))
				)
			)
		)
		.all();
	return row ?? null;
}

const tripDone = (scope: FamilyScope, childId: number, now: Date) => {
	const stops = tripStops(scope, childId, now);
	return stops.length > 0 && stops.every((s) => s.state === 'done');
};

/** The bonus the child earned today, or null. */
export function bonusToday(scope: FamilyScope, childId: number, now = new Date()) {
	const row = bonusRow(scope, childId, choreDay(now));
	return row ? { stars: row.amount } : null;
}

/**
 * Add today's bonus if the child's trip is now all Done and it has not been
 * earned yet. Call after anything that can finish a trip. Returns whether it
 * was added.
 */
export function settleBonus(scope: FamilyScope, childId: number, now = new Date()) {
	const day = choreDay(now);
	if (bonusRow(scope, childId, day) || !tripDone(scope, childId, now)) return false;
	addStars(scope, { childId, kind: 'bonus', amount: DAILY_BONUS, sourceId: bonusSource(day) });
	return true;
}

/** Every child in the family, after a grown-up changes chores. */
export function settleFamilyBonuses(scope: FamilyScope, now = new Date()) {
	for (const child of scope.children()) settleBonus(scope, child.id, now);
}

/**
 * After a grown-up undoes an accept: if that accept finished the trip, its
 * bonus goes too. Returns whether it was removed.
 */
export function undoBonus(scope: FamilyScope, childId: number, now = new Date()) {
	const row = bonusRow(scope, childId, choreDay(now));
	if (!row || tripDone(scope, childId, now)) return false;
	scope.db
		.delete(schema.starEvent)
		.where(scope.where(schema.starEvent, eq(schema.starEvent.id, row.id)))
		.run();
	return true;
}
