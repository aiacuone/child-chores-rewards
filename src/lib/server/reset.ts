// The daily reset (docs/SPEC.md, "Repeating chores"; ADR 0010). At the reset
// time, Completed and Skipped copies of chores that are due again go back to
// Pending. Waiting copies are left for a grown-up to check. Stars are never
// touched.
//
// The job checks every minute whether a family's chore day has changed since
// its last reset, and runs it once per chore day. A restart or deploy over the
// reset time is caught up as soon as the app starts again.
import { eq, inArray } from 'drizzle-orm';
import { schema, type Db } from './db';
import { forFamily, type FamilyScope } from './family';
import { toRepeat } from './chores';
import { choreDay, isDue } from '../repeat';

const CHECK_EVERY = 60 * 1000;

/**
 * Reset one family for the current chore day, unless that has already run.
 * Returns how many copies went back to pending, or null when it had already run.
 */
export function resetFamily(scope: FamilyScope, now = new Date()) {
	const day = choreDay(now);
	return scope.db.transaction((tx) => {
		// The unique index on family + day lets only one run claim the day.
		const [claimed] = tx
			.insert(schema.choreReset)
			.values({ familyId: scope.familyId, choreDay: day, ranAt: now })
			.onConflictDoNothing()
			.returning({ id: schema.choreReset.id })
			.all();
		if (!claimed) return null;

		const due = tx
			.select()
			.from(schema.chore)
			.where(scope.where(schema.chore))
			.all()
			.filter((c) => isDue(toRepeat(c), day))
			.map((c) => c.id);
		if (!due.length) return 0;

		const reset = tx
			.update(schema.choreCopy)
			.set({ status: 'pending', doneAt: null })
			.where(
				scope.where(
					schema.choreCopy,
					inArray(schema.choreCopy.choreId, due),
					inArray(schema.choreCopy.status, ['completed', 'skipped'])
				)
			)
			.run().changes;
		tx.update(schema.choreReset)
			.set({ copiesReset: reset })
			.where(scope.where(schema.choreReset, eq(schema.choreReset.id, claimed.id)))
			.run();
		return reset;
	});
}

/** Reset every family that has not reset for its current chore day. */
export function resetAll(db: Db, now = new Date()) {
	for (const { id } of db.select({ id: schema.family.id }).from(schema.family).all()) {
		const reset = resetFamily(forFamily(db, id), now);
		if (reset !== null)
			console.info(`daily reset: family ${id}, chore day ${choreDay(now)}, ${reset} copies`);
	}
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Start the job: run now (the catch-up), then check every minute. */
export function startResetJob(db: Db) {
	if (timer) return;
	const run = () => {
		try {
			resetAll(db);
		} catch (e) {
			console.error('daily reset failed', e);
		}
	};
	run();
	timer = setInterval(run, CHECK_EVERY);
	timer.unref?.();
}
