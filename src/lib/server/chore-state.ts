// Skipping and hiding a chore (docs/SPEC.md, "Chores"). Both belong to the chore,
// so they apply to every child's copy, and neither touches a copy's status or any
// stars: the trip just leaves the chore out. Taking a stop off a trip can leave
// the rest all Done, so each change settles the daily bonus.
import { eq } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { settleFamilyBonuses } from './bonus';
import { getChore } from './chores';
import type { ChoreAction } from './forms/chores';
import { tripStops, type StopState } from './trip';
import { addDays, daysBetween, isDue } from '../repeat';
import { SKIP_DATE, SKIP_DAYS, skipToday } from '../skip';
import { familyDay } from './settings';

/** A picked date outside the allowed range. */
export class BadSkip extends Error {}

function changes(action: ChoreAction, day: string) {
	switch (action.action) {
		case 'hide':
			return { hidden: true };
		case 'unhide':
			return { hidden: false };
		case 'unskip':
			return { skipUntil: null, skipOpen: false };
		case 'skipUntil': {
			const ahead = daysBetween(day, action.date);
			if (ahead < SKIP_DATE.minDays || ahead > SKIP_DATE.maxDays) throw new BadSkip();
			return { skipUntil: action.date, skipOpen: false };
		}
		case 'skip':
			return action.length === 'open'
				? { skipUntil: null, skipOpen: true }
				: { skipUntil: addDays(day, SKIP_DAYS[action.length]), skipOpen: false };
	}
}

/** Skip, hide or turn back on. False when the chore is not in this family. */
export function applyChoreAction(
	scope: FamilyScope,
	choreId: number,
	action: ChoreAction,
	now = new Date()
) {
	if (!Number.isSafeInteger(choreId) || choreId <= 0) return false;
	const set = changes(action, familyDay(scope, now));
	return scope.db.transaction(() => {
		const changed = scope.db
			.update(schema.chore)
			.set(set)
			.where(scope.where(schema.chore, eq(schema.chore.id, choreId)))
			.run().changes;
		if (changed !== 1) return false;
		settleFamilyBonuses(scope, now);
		return true;
	});
}

const STATE_WORDS: Record<StopState, string> = {
	done: 'done',
	waiting: 'to check',
	next: 'up next',
	open: 'to do'
};

/** The chore screen's Today row: "Mia: up next · Leo: done", or why it is not on a trip. */
export function choreToday(scope: FamilyScope, choreId: number, now = new Date()) {
	const chore = getChore(scope, choreId, now);
	if (!chore) return '';
	const day = familyDay(scope, now);
	const away = [
		...(chore.hidden ? ['Hidden from children'] : []),
		...(chore.skip ? [skipToday(chore.skip, day)] : [])
	];
	if (away.length) return away.join(' · ');
	if (!chore.childIds.length) return 'Nobody yet';
	if (!isDue(chore.repeat, day)) return 'Not due today';
	return scope
		.children()
		.filter((c) => chore.childIds.includes(c.id))
		.map((c) => {
			const stop = tripStops(scope, c.id, now).find((s) => s.choreId === choreId);
			return `${c.name}: ${STATE_WORDS[stop?.state ?? 'open']}`;
		})
		.join(' · ');
}
