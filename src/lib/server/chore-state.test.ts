import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { addChore, getChore, listChores } from './chores';
import { applyChoreAction, BadSkip, choreToday } from './chore-state';
import { accept, toCheck } from './check';
import { bonusToday } from './bonus';
import { parseChoreAction } from './forms/chores';
import { resetFamily } from './reset';
import { balance } from './stars';
import { comingUp, iDidIt, justSent, openStop, tripStops } from './trip';
import { skipNotice, skipPill, skipToday } from '../skip';

let opened: ReturnType<typeof openDatabase>;
let ours: FamilyScope;
let theirs: FamilyScope;
let mia: number;
let leo: number;
let sam: number;

beforeEach(() => {
	opened = openDatabase(':memory:');
	const [a, b] = opened.db
		.insert(schema.family)
		.values([{ name: 'Ours' }, { name: 'Theirs' }])
		.returning()
		.all();
	ours = forFamily(opened.db, a.id);
	theirs = forFamily(opened.db, b.id);
	mia = ours.addChild('Mia', 'pink').id;
	leo = ours.addChild('Leo', 'blue').id;
	sam = theirs.addChild('Sam', 'green').id;
});
afterEach(() => opened.sqlite.close());

// 10:00 am Tuesday 17 Nov 2026, Melbourne. Later days are at the same time.
const now = new Date('2026-11-16T23:00:00Z');
const day = (n: number) => new Date(now.getTime() + n * 24 * 3600_000);
// 5:00 am Wednesday: still Tuesday's chore day.
const beforeReset = new Date('2026-11-17T18:00:00Z');

function chore(name: string, childIds: number[], repeat: object = { kind: 'daily' }, scope = ours) {
	return addChore(
		scope,
		{ name, expectations: '', icon: 'paw', stars: 10, childIds, repeat } as never,
		now
	);
}
const onTrip = (when = now, child = mia) => tripStops(ours, child, when).map((s) => s.name);
const act = (id: number, action: Parameters<typeof applyChoreAction>[2], when = now) =>
	applyChoreAction(ours, id, action, when);

describe('skipping', () => {
	it('today only: gone until the next reset, and no status changes', () => {
		const id = chore('Tidy', [mia, leo]);
		expect(act(id, { action: 'skip', length: 'today' })).toBe(true);
		expect(onTrip()).toEqual([]);
		expect(onTrip(now, leo)).toEqual([]);
		expect(onTrip(beforeReset)).toEqual([]);
		expect(onTrip(day(1))).toEqual(['Tidy']);
		expect(getChore(ours, id)!.copies.map((c) => c.status)).toEqual(['pending', 'pending']);
	});

	it('2 and 3 days come back on the right day', () => {
		const two = chore('Two', [mia]);
		const three = chore('Three', [mia]);
		act(two, { action: 'skip', length: '2' });
		act(three, { action: 'skip', length: '3' });
		expect(onTrip(day(1))).toEqual([]);
		expect(onTrip(day(2))).toEqual(['Two']);
		expect(onTrip(day(3))).toEqual(['Two', 'Three']);
	});

	it('a picked date must be from the day after tomorrow to a year ahead', () => {
		const id = chore('Tidy', [mia]);
		for (const date of ['2026-11-16', '2026-11-17', '2026-11-18', '2027-11-18'])
			expect(() => act(id, { action: 'skipUntil', date })).toThrow(BadSkip);
		expect(getChore(ours, id, now)!.skip).toBeNull();
		expect(act(id, { action: 'skipUntil', date: '2026-11-19' })).toBe(true);
		expect(act(id, { action: 'skipUntil', date: '2027-11-17' })).toBe(true);
		expect(getChore(ours, id, now)!.skip).toEqual({ until: '2027-11-17' });
	});

	it('until turned back on stays away, and Turn back on returns it at once', () => {
		const id = chore('Tidy', [mia]);
		act(id, { action: 'skip', length: 'open' });
		expect(onTrip(day(30))).toEqual([]);
		expect(getChore(ours, id, day(30))!.skip).toEqual({ until: null });
		act(id, { action: 'unskip' }, day(30));
		expect(onTrip(day(30))).toEqual(['Tidy']);
		expect(getChore(ours, id, day(30))!.skip).toBeNull();
	});

	it('a skip that has ended no longer shows as one', () => {
		const id = chore('Tidy', [mia]);
		act(id, { action: 'skip', length: '2' });
		expect(listChores(ours, day(1))[0].skip).toEqual({ until: '2026-11-19' });
		expect(listChores(ours, day(2))[0].skip).toBeNull();
	});

	it('a skipped stop cannot be opened or sent', () => {
		const id = chore('Tidy', [mia]);
		act(id, { action: 'skip', length: 'today' });
		expect(openStop(ours, mia, id, now)).toBeNull();
		expect(iDidIt(ours, mia, id, now)).toBeNull();
	});

	it('Coming up gives the first due day after the skip', () => {
		// Due Wednesday and Friday; skipped until Thursday.
		const id = chore('Bins', [mia], { kind: 'weekly', days: [2, 4] });
		expect(comingUp(ours, mia, now)[0].day).toBe('Wednesday');
		act(id, { action: 'skip', length: '2' });
		expect(comingUp(ours, mia, now)[0].day).toBe('Friday');
		act(id, { action: 'skip', length: 'open' });
		expect(comingUp(ours, mia, now)).toEqual([]);
	});

	it('the daily reset still returns its finished copies', () => {
		const id = chore('Tidy', [mia]);
		const sent = iDidIt(ours, mia, id, now)!;
		accept(ours, sent.copyId, now);
		act(id, { action: 'skip', length: 'today' });
		resetFamily(ours, day(1));
		expect(getChore(ours, id, day(1))!.copies[0].status).toBe('pending');
		expect(tripStops(ours, mia, day(1)).map((s) => s.state)).toEqual(['next']);
	});
});

describe('hiding', () => {
	it('takes it off every child screen, and grown-ups still see it', () => {
		const id = chore('Tidy', [mia]);
		const bins = chore('Bins', [mia], { kind: 'weekly', days: [2] });
		act(id, { action: 'hide' });
		act(bins, { action: 'hide' });
		expect(onTrip()).toEqual([]);
		expect(comingUp(ours, mia, now)).toEqual([]);
		expect(openStop(ours, mia, id, now)).toBeNull();
		expect(iDidIt(ours, mia, id, now)).toBeNull();
		expect(listChores(ours, now).map((c) => [c.name, c.hidden])).toEqual([
			['Bins', true],
			['Tidy', true]
		]);
		act(id, { action: 'unhide' });
		expect(onTrip()).toEqual(['Tidy']);
	});

	it('hides "Sent!" too, within the Undo minute', () => {
		const id = chore('Tidy', [mia]);
		iDidIt(ours, mia, id, now);
		expect(justSent(ours, mia, id, now)).not.toBeNull();
		act(id, { action: 'hide' });
		expect(justSent(ours, mia, id, now)).toBeNull();
	});
});

describe('stars and the bonus', () => {
	it('skipping or hiding the last open stop earns the bonus for the rest', () => {
		const done = chore('Done', [mia]);
		const rest = chore('Rest', [mia]);
		accept(ours, iDidIt(ours, mia, done, now)!.copyId, now);
		expect(bonusToday(ours, mia, now)).toBeNull();
		act(rest, { action: 'skip', length: 'today' });
		expect(bonusToday(ours, mia, now)).toEqual({ stars: 20 });
		expect(balance(ours, mia)).toBe(30);

		const other = chore('Leo’s', [leo]);
		const open = chore('Leo’s rest', [leo]);
		accept(ours, iDidIt(ours, leo, other, now)!.copyId, now);
		act(open, { action: 'hide' });
		expect(bonusToday(ours, leo, now)).toEqual({ stars: 20 });
	});

	it('skipping everything earns nothing', () => {
		act(chore('Tidy', [mia]), { action: 'skip', length: 'today' });
		expect(bonusToday(ours, mia, now)).toBeNull();
		expect(balance(ours, mia)).toBe(0);
	});

	it('keeps stars already earned, and a waiting chore can still be checked', () => {
		const earned = chore('Earned', [mia]);
		const waiting = chore('Waiting', [mia]);
		accept(ours, iDidIt(ours, mia, earned, now)!.copyId, now);
		const copy = iDidIt(ours, mia, waiting, now)!.copyId;
		act(earned, { action: 'skip', length: 'today' });
		act(waiting, { action: 'hide' });
		expect(onTrip()).toEqual([]);
		expect(balance(ours, mia)).toBe(10);
		expect(toCheck(ours).map((c) => c.copyId)).toEqual([copy]);
		expect(accept(ours, copy, now)).toBe(true);
		expect(balance(ours, mia)).toBe(20);
	});
});

describe('wording', () => {
	const today = '2026-11-17';
	it.each([
		['2026-11-18', 'Skipped today', 'Tidy skipped for today', 'Skipped · back tomorrow'],
		[
			'2026-11-20',
			'Skipped to Fri',
			'Tidy skipped for 3 days. Back on Friday',
			'Skipped · back on Friday'
		],
		[
			'2026-12-25',
			'Skipped to 25 Dec',
			'Tidy skipped for 38 days. Back on Fri 25 Dec',
			'Skipped · back on Fri 25 Dec'
		],
		[null, 'Skipped', 'Tidy skipped until you turn it back on', 'Skipped · until turned back on']
	])('until %s', (until, pill, notice, row) => {
		expect(skipPill({ until }, today)).toBe(pill);
		expect(skipNotice('Tidy', { until }, today)).toBe(notice);
		expect(skipToday({ until }, today)).toBe(row);
	});

	it('the Today row says how each child is doing, or why it is off the trip', () => {
		const id = chore('Tidy', [mia, leo]);
		const second = chore('Second', [mia]);
		expect(choreToday(ours, id, now)).toBe('Mia: up next · Leo: up next');
		accept(ours, iDidIt(ours, leo, id, now)!.copyId, now);
		iDidIt(ours, mia, second, now);
		expect(choreToday(ours, id, now)).toBe('Mia: up next · Leo: done');
		expect(choreToday(ours, second, now)).toBe('Mia: to check');
		expect(choreToday(ours, chore('Nobody', []), now)).toBe('Nobody yet');
		expect(choreToday(ours, chore('Bins', [mia], { kind: 'weekly', days: [4] }), now)).toBe(
			'Not due today'
		);
		act(id, { action: 'hide' });
		act(id, { action: 'skip', length: '3' });
		expect(choreToday(ours, id, now)).toBe('Hidden from children · Skipped · back on Friday');
	});
});

describe('checks', () => {
	it('refuses bad actions', () => {
		expect(parseChoreAction({ action: 'skip', length: 'today' })).not.toBeNull();
		expect(parseChoreAction({ action: 'skipUntil', date: '2026-11-20' })).not.toBeNull();
		for (const bad of [
			null,
			{},
			{ action: 'delete' },
			{ action: 'skip' },
			{ action: 'skip', length: '4' },
			{ action: 'skipUntil', date: 'soon' },
			{ action: 'skipUntil', date: '2026-02-30' }
		])
			expect(parseChoreAction(bad)).toBeNull();
	});

	it('never changes another family’s chore', () => {
		const theirChore = chore('Theirs', [sam], { kind: 'daily' }, theirs);
		for (const action of [
			{ action: 'hide' },
			{ action: 'skip', length: 'open' },
			{ action: 'unskip' }
		] as const)
			expect(applyChoreAction(ours, theirChore, action, now)).toBe(false);
		expect(applyChoreAction(ours, Number.NaN, { action: 'hide' }, now)).toBe(false);
		expect(tripStops(theirs, sam, now).map((s) => s.name)).toEqual(['Theirs']);
		expect(getChore(theirs, theirChore, now)).toMatchObject({ hidden: false, skip: null });
	});
});
