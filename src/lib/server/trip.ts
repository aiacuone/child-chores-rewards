// A child's trip (docs/SPEC.md, "Trip, stars and bonus"; Space-Child.dc.html).
// The trip is the child's copies of chores that are due on today's chore day,
// apart from skipped ones. Coming up is their chores due on the next 6 days
// instead (Child-Coming.dc.html). Only the signed-in family's rows are read.
import { and, eq } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { toRepeat } from './chores';
import { addDays, choreDay, isDue, repeatLabel, weekday, WEEKDAYS, type Repeat } from '../repeat';
import type { ChoreIconId } from '../chore-icons';

/** Done and Grown-up checking count towards "2 of 5"; Up next is the first open stop. */
export type StopState = 'done' | 'waiting' | 'next' | 'open';

export type TripStop = {
	choreId: number;
	name: string;
	icon: ChoreIconId;
	stars: number;
	state: StopState;
};

export type ComingUp = {
	choreId: number;
	name: string;
	icon: ChoreIconId;
	stars: number;
	/** The day it is next due, for example "Thursday". */
	day: string;
};

/** How far ahead Coming up looks: the next 6 days. */
const COMING_UP_DAYS = 6;

/** The child's copies with their chores, oldest chore first. */
function copies(scope: FamilyScope, childId: number) {
	return scope.db
		.select({ chore: schema.chore, status: schema.choreCopy.status })
		.from(schema.choreCopy)
		.innerJoin(schema.chore, eq(schema.chore.id, schema.choreCopy.choreId))
		.where(
			and(
				scope.where(schema.choreCopy, eq(schema.choreCopy.childId, childId)),
				eq(schema.chore.familyId, scope.familyId)
			)
		)
		.orderBy(schema.chore.id)
		.all()
		.map((r) => ({ ...r, repeat: toRepeat(r.chore) }));
}

const ORDER = { completed: 0, waiting: 1, pending: 2 } as const;

/**
 * Today's stops for a child, in path order from the start: done, then waiting
 * for a grown-up, then the rest. The first of the rest is Up next.
 */
export function tripStops(scope: FamilyScope, childId: number, now = new Date()): TripStop[] {
	const day = choreDay(now);
	const today = copies(scope, childId).filter(
		(c) => c.status !== 'skipped' && isDue(c.repeat, day)
	);
	today.sort(
		(a, b) => ORDER[a.status as keyof typeof ORDER] - ORDER[b.status as keyof typeof ORDER]
	);
	let next = true;
	return today.map(({ chore, status }) => {
		let state: StopState =
			status === 'completed' ? 'done' : status === 'waiting' ? 'waiting' : 'open';
		if (state === 'open' && next) {
			state = 'next';
			next = false;
		}
		return { choreId: chore.id, name: chore.name, icon: chore.icon, stars: chore.stars, state };
	});
}

/** The first of the next 6 days the repeat is due, or null. */
function nextDue(repeat: Repeat, today: string) {
	for (let i = 1; i <= COMING_UP_DAYS; i++) {
		const d = addDays(today, i);
		if (isDue(repeat, d)) return d;
	}
	return null;
}

/** The child's chores that are not due today but are due in the next 6 days, soonest first. */
export function comingUp(scope: FamilyScope, childId: number, now = new Date()): ComingUp[] {
	const day = choreDay(now);
	return copies(scope, childId)
		.filter((c) => !isDue(c.repeat, day))
		.map((c) => ({ c, next: nextDue(c.repeat, day) }))
		.filter((x): x is { c: (typeof x)['c']; next: string } => x.next !== null)
		.sort((a, b) => a.next.localeCompare(b.next))
		.map(({ c, next }) => ({
			choreId: c.chore.id,
			name: c.chore.name,
			icon: c.chore.icon,
			stars: c.chore.stars,
			day: WEEKDAYS[weekday(next)].long
		}));
}

/**
 * One stop a child can open: a chore of theirs that is due today and not done,
 * waiting or skipped. Null otherwise, including another family's chore.
 */
export function openStop(scope: FamilyScope, childId: number, choreId: number, now = new Date()) {
	if (!Number.isSafeInteger(choreId) || choreId <= 0) return null;
	const day = choreDay(now);
	const stop = copies(scope, childId).find((c) => c.chore.id === choreId);
	if (!stop || stop.status !== 'pending' || !isDue(stop.repeat, day)) return null;
	return {
		choreId: stop.chore.id,
		name: stop.chore.name,
		icon: stop.chore.icon,
		stars: stop.chore.stars,
		expectations: stop.chore.expectations,
		repeats: repeatLabel(stop.repeat, day)
	};
}
