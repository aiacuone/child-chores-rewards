import { describe, expect, it } from 'vitest';
import { choreDay, isDue, onceChoices, repeatLabel, weekday, type Repeat } from './repeat';

// Melbourne is UTC+11 in summer (AEDT) and UTC+10 in winter (AEST).
describe('choreDay', () => {
	it('uses Melbourne time, not the server clock', () => {
		// 6:00 am UTC is 5:00 pm in Melbourne.
		expect(choreDay(new Date('2026-11-17T06:00:00Z'))).toBe('2026-11-17');
		// 2:00 pm UTC on the 17th is 1:00 am on the 18th in Melbourne: still the 17th's chore day.
		expect(choreDay(new Date('2026-11-17T14:00:00Z'))).toBe('2026-11-17');
	});

	it('turns over at 6:00 am Melbourne time', () => {
		expect(choreDay(new Date('2026-11-17T18:59:00Z'))).toBe('2026-11-17'); // 5:59 am
		expect(choreDay(new Date('2026-11-17T19:00:00Z'))).toBe('2026-11-18'); // 6:00 am
	});

	it('turns over at 6:00 am on the days daylight saving starts and ends', () => {
		// Starts Sunday 4 Oct 2026 (clocks go 2:00 to 3:00): 6:00 am is 19:00 UTC.
		expect(choreDay(new Date('2026-10-03T18:59:00Z'))).toBe('2026-10-03');
		expect(choreDay(new Date('2026-10-03T19:00:00Z'))).toBe('2026-10-04');
		// Ends Sunday 5 Apr 2026 (clocks go 3:00 to 2:00): 6:00 am is 20:00 UTC.
		expect(choreDay(new Date('2026-04-04T19:59:00Z'))).toBe('2026-04-04');
		expect(choreDay(new Date('2026-04-04T20:00:00Z'))).toBe('2026-04-05');
		// The day after each change is still a normal day.
		expect(choreDay(new Date('2026-10-04T19:00:00Z'))).toBe('2026-10-05');
		expect(choreDay(new Date('2026-04-05T20:00:00Z'))).toBe('2026-04-06');
	});

	it('follows a different reset time', () => {
		expect(choreDay(new Date('2026-11-17T20:00:00Z'), 8 * 60)).toBe('2026-11-17'); // 7:00 am
	});
});

/** Which of these days the repeat is due on. */
const dueOn = (repeat: Repeat, days: string[]) => days.filter((d) => isDue(repeat, d));

describe('isDue', () => {
	it('daily: every day', () => {
		expect(dueOn({ kind: 'daily' }, ['2026-11-17', '2026-11-18', '2027-02-28'])).toHaveLength(3);
	});

	it('weekly: the days picked, Monday first', () => {
		expect(weekday('2026-11-16')).toBe(0); // Monday
		expect(weekday('2026-11-22')).toBe(6); // Sunday
		const mwf: Repeat = { kind: 'weekly', days: [0, 2, 4] };
		expect(
			dueOn(mwf, [
				'2026-11-16',
				'2026-11-17',
				'2026-11-18',
				'2026-11-19',
				'2026-11-20',
				'2026-11-21',
				'2026-11-22'
			])
		).toEqual(['2026-11-16', '2026-11-18', '2026-11-20']);
		// The Sunday daylight saving starts is still a Sunday.
		expect(isDue({ kind: 'weekly', days: [6] }, '2026-10-04')).toBe(true);
	});

	it('monthly: that day, or the last day in shorter months', () => {
		const the31st: Repeat = { kind: 'monthly', day: 31 };
		expect(isDue(the31st, '2026-12-31')).toBe(true);
		expect(isDue(the31st, '2026-11-30')).toBe(true);
		expect(isDue(the31st, '2026-11-29')).toBe(false);
		expect(isDue(the31st, '2027-02-28')).toBe(true);
		expect(isDue({ kind: 'monthly', day: 29 }, '2028-02-29')).toBe(true);
		expect(isDue({ kind: 'monthly', day: 29 }, '2028-02-28')).toBe(false);
		expect(dueOn({ kind: 'monthly', day: 15 }, ['2026-11-14', '2026-11-15', '2026-12-15'])).toEqual(
			['2026-11-15', '2026-12-15']
		);
	});

	it('custom: every few days or weeks from the start, across daylight saving', () => {
		const every3: Repeat = { kind: 'custom', every: 3, unit: 'days', start: '2026-10-02' };
		expect(
			dueOn(every3, ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-08'])
		).toEqual(['2026-10-02', '2026-10-05', '2026-10-08']);
		const fortnightly: Repeat = { kind: 'custom', every: 2, unit: 'weeks', start: '2026-09-27' };
		expect(
			dueOn(fortnightly, ['2026-10-04', '2026-10-11', '2026-10-12', '2027-03-28', '2027-04-04'])
		).toEqual(['2026-10-11', '2027-03-28']);
	});

	it('once: only that date', () => {
		expect(
			dueOn({ kind: 'once', date: '2026-11-22' }, ['2026-11-21', '2026-11-22', '2026-11-29'])
		).toEqual(['2026-11-22']);
	});
});

describe('repeatLabel', () => {
	const today = '2026-11-17'; // a Tuesday
	it('reads like the designs', () => {
		expect(repeatLabel({ kind: 'daily' }, today)).toBe('Every day');
		expect(repeatLabel({ kind: 'weekly', days: [4, 0, 2] }, today)).toBe('Mon, Wed, Fri');
		expect(repeatLabel({ kind: 'weekly', days: [0, 1, 2, 3, 4, 5, 6] }, today)).toBe('Every day');
		expect(repeatLabel({ kind: 'monthly', day: 1 }, today)).toBe('Monthly, on the 1st');
		expect(repeatLabel({ kind: 'monthly', day: 22 }, today)).toBe('Monthly, on the 22nd');
		expect(repeatLabel({ kind: 'monthly', day: 13 }, today)).toBe('Monthly, on the 13th');
		expect(repeatLabel({ kind: 'custom', every: 3, unit: 'days' }, today)).toBe('Every 3 days');
		expect(repeatLabel({ kind: 'custom', every: 1, unit: 'weeks' }, today)).toBe('Every week');
		expect(repeatLabel({ kind: 'once', date: '2026-11-22' }, today)).toBe('Once, Sunday');
		expect(repeatLabel({ kind: 'once', date: '2026-11-10' }, today)).toBe('Once, 10 Nov');
	});

	it('offers today and the next 6 days for Once', () => {
		expect(onceChoices(today).map((d) => d.label)).toEqual([
			'Today',
			'Tomorrow',
			'Thu',
			'Fri',
			'Sat',
			'Sun',
			'Mon'
		]);
	});
});
