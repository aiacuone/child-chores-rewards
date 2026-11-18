// Skipping a chore (docs/SPEC.md, "Chores"; Skip-Options.dc.html). A skip is a
// date, not a job: the chore is away until the chore day it comes back, so it
// returns by itself at that day's reset. Shared by the server and the pages.
import { addDays, daysBetween, shortDate, WEEKDAYS, weekday } from './repeat';

/** A skip in force. `until` is the chore day it is back; null means until turned back on. */
export type Skip = { until: string | null };

/** How many days each length on Skip-Options takes it away, counting today. */
export const SKIP_DAYS = { today: 1, '2': 2, '3': 3 } as const;

/** A picked date: after the "Today only" return, and up to a year ahead. */
export const SKIP_DATE = { minDays: 2, maxDays: 365 } as const;

/** The skip in force on a chore day, or null. */
export function activeSkip(
	c: { skipUntil: string | null; skipOpen: boolean },
	day: string
): Skip | null {
	if (c.skipOpen) return { until: null };
	return c.skipUntil !== null && day < c.skipUntil ? { until: c.skipUntil } : null;
}

/** "Tuesday" within the coming week, then "Fri 25 Dec" so the day is not mistaken. */
export const backOn = (until: string, today: string) =>
	daysBetween(today, until) < 7 ? WEEKDAYS[weekday(until)].long : shortDate(until);

const isTomorrow = (until: string, today: string) => until === addDays(today, 1);

/** The pill on the Chores tab: "Skipped today", "Skipped to Tue" or "Skipped". */
export function skipPill({ until }: Skip, today: string) {
	if (until === null) return 'Skipped';
	if (isTomorrow(until, today)) return 'Skipped today';
	const near = daysBetween(today, until) < 7;
	return `Skipped to ${near ? WEEKDAYS[weekday(until)].short : shortDate(until).slice(4)}`;
}

/** The notice after skipping: "Tidy the toy box skipped for 3 days. Back on Tuesday". */
export function skipNotice(name: string, { until }: Skip, today: string) {
	if (until === null) return `${name} skipped until you turn it back on`;
	if (isTomorrow(until, today)) return `${name} skipped for today`;
	return `${name} skipped for ${daysBetween(today, until)} days. Back on ${backOn(until, today)}`;
}

/** The chore screen's Today row: "Skipped · back on Tuesday". */
export function skipToday({ until }: Skip, today: string) {
	if (until === null) return 'Skipped · until turned back on';
	if (isTomorrow(until, today)) return 'Skipped · back tomorrow';
	return `Skipped · back on ${backOn(until, today)}`;
}
