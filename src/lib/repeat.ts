// When a chore is due (docs/SPEC.md, "Repeating chores"; ADR 0010). Shared by
// the server (what is due, the daily reset) and the grown-up pages (labels).
//
// Every date is a Melbourne calendar date written 'YYYY-MM-DD', never a moment
// in time, so daylight saving cannot move a chore to another day. Date maths
// on these strings is done on UTC midnights, where every day is 24 hours.

export const TIME_ZONE = 'Australia/Melbourne';
/** The default daily reset, in minutes after midnight. Each family can change it in Settings. */
export const RESET_MINUTES = 6 * 60;

/** Days of the week, Monday first: 0 is Monday, 6 is Sunday. */
export const WEEKDAYS = [
	{ letter: 'M', short: 'Mon', long: 'Monday' },
	{ letter: 'T', short: 'Tue', long: 'Tuesday' },
	{ letter: 'W', short: 'Wed', long: 'Wednesday' },
	{ letter: 'T', short: 'Thu', long: 'Thursday' },
	{ letter: 'F', short: 'Fri', long: 'Friday' },
	{ letter: 'S', short: 'Sat', long: 'Saturday' },
	{ letter: 'S', short: 'Sun', long: 'Sunday' }
] as const;

export const REPEAT_KINDS = ['daily', 'weekly', 'monthly', 'custom', 'once'] as const;
export const REPEAT_LABELS = {
	daily: 'Daily',
	weekly: 'Weekly',
	monthly: 'Monthly',
	custom: 'Custom',
	once: 'Once'
} as const;
/** Monthly: day 1 to 31. Custom: every 1 to 30 days or weeks. Once: today or the next 6 days. */
export const REPEAT_LIMITS = {
	monthDay: { min: 1, max: 31 },
	every: { min: 1, max: 30 },
	onceDays: 7
};

/** What a grown-up picks. Custom counts from the day it is saved, which the server adds. */
export type RepeatInput =
	| { kind: 'daily' }
	| { kind: 'weekly'; days: number[] }
	| { kind: 'monthly'; day: number }
	| { kind: 'custom'; every: number; unit: 'days' | 'weeks' }
	| { kind: 'once'; date: string };

/** A saved repeat. */
export type Repeat =
	| Exclude<RepeatInput, { kind: 'custom' }>
	| { kind: 'custom'; every: number; unit: 'days' | 'weeks'; start: string };

const parts = new Intl.DateTimeFormat('en-AU', {
	timeZone: TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** The Melbourne date and minutes after midnight at a moment. */
export function melbourne(now: Date) {
	const p = Object.fromEntries(parts.formatToParts(now).map((x) => [x.type, x.value]));
	return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/**
 * The chore day at a moment: the Melbourne date, except before the reset time,
 * when it is still the day before. At 3:00 am Tuesday it is Monday's chore day.
 */
export function choreDay(now: Date, resetMinutes = RESET_MINUTES) {
	const { date, minutes } = melbourne(now);
	return minutes < resetMinutes ? addDays(date, -1) : date;
}

const toUtc = (date: string) =>
	Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const DAY = 24 * 60 * 60 * 1000;

/** True for a real calendar date written 'YYYY-MM-DD'. */
export function isDate(s: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUtc(toUtc(s)) === s;
}

export function addDays(date: string, n: number) {
	return fromUtc(toUtc(date) + n * DAY);
}

/** Whole days from a to b (negative when b is earlier). */
export function daysBetween(a: string, b: string) {
	return Math.round((toUtc(b) - toUtc(a)) / DAY);
}

/** 0 is Monday, 6 is Sunday. */
export function weekday(date: string) {
	return (new Date(toUtc(date)).getUTCDay() + 6) % 7;
}

/** "Sun 15 Nov". */
export const shortDate = (date: string) =>
	`${WEEKDAYS[weekday(date)].short} ${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;

function daysInMonth(date: string) {
	return new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7), 0)).getUTCDate();
}

/** Is a chore with this repeat due on this chore day? */
export function isDue(repeat: Repeat, day: string) {
	switch (repeat.kind) {
		case 'daily':
			return true;
		case 'weekly':
			return repeat.days.includes(weekday(day));
		case 'monthly':
			// The 31st in a 30-day month falls on the 30th, the last day.
			return +day.slice(8, 10) === Math.min(repeat.day, daysInMonth(day));
		case 'custom': {
			const gap = daysBetween(repeat.start, day);
			return gap >= 0 && gap % (repeat.every * (repeat.unit === 'weeks' ? 7 : 1)) === 0;
		}
		case 'once':
			return repeat.date === day;
	}
}

/** 1st, 2nd, 3rd, 4th … 31st. */
export const ordinal = (n: number) =>
	n +
	(n % 10 === 1 && n !== 11
		? 'st'
		: n % 10 === 2 && n !== 12
			? 'nd'
			: n % 10 === 3 && n !== 13
				? 'rd'
				: 'th');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * How a repeat reads on the Chores list and a chore's screen: "Every day",
 * "Mon, Wed, Fri", "Monthly, on the 15th", "Every 3 days", "Once, Sunday".
 * A Once date outside the coming week shows the date instead: "Once, 3 Dec".
 */
export function repeatLabel(repeat: Repeat | RepeatInput, today: string) {
	switch (repeat.kind) {
		case 'daily':
			return 'Every day';
		case 'weekly':
			if (repeat.days.length === 7) return 'Every day';
			return [...repeat.days]
				.sort()
				.map((d) => WEEKDAYS[d].short)
				.join(', ');
		case 'monthly':
			return `Monthly, on the ${ordinal(repeat.day)}`;
		case 'custom': {
			const unit = repeat.unit === 'weeks' ? 'week' : 'day';
			return repeat.every === 1 ? `Every ${unit}` : `Every ${repeat.every} ${unit}s`;
		}
		case 'once': {
			const ahead = daysBetween(today, repeat.date);
			if (ahead >= 0 && ahead < REPEAT_LIMITS.onceDays)
				return `Once, ${WEEKDAYS[weekday(repeat.date)].long}`;
			return `Once, ${+repeat.date.slice(8, 10)} ${MONTHS[+repeat.date.slice(5, 7) - 1]}`;
		}
	}
}

/** The days a Once chore can be set for: today and the next 6. */
export function onceChoices(today: string) {
	return Array.from({ length: REPEAT_LIMITS.onceDays }, (_, i) => {
		const date = addDays(today, i);
		const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : WEEKDAYS[weekday(date)].short;
		return { date, label, long: `${label}, ${WEEKDAYS[weekday(date)].long}` };
	});
}
