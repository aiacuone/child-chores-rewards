import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { addChore, getChore } from './chores';
import { resetAll, resetFamily } from './reset';
import { addStars, balance } from './stars';
import type { ChoreInput } from './forms/chores';

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

// Melbourne times: Monday 16 Nov 2026 and the mornings after.
const monNoon = new Date('2026-11-16T01:00:00Z');
const tue559 = new Date('2026-11-16T18:59:00Z');
const tue6 = new Date('2026-11-16T19:00:00Z');
const wed6 = new Date('2026-11-17T19:00:00Z');

const chore = (scope: FamilyScope, childIds: number[], repeat: ChoreInput['repeat']) =>
	addChore(scope, { name: 'Tidy the toy box', icon: 'toys', stars: 10, childIds, repeat }, monNoon);

const setStatus = (status: string, childId: number) =>
	opened.sqlite.prepare('update chore_copy set status = ? where child_id = ?').run(status, childId);

const statuses = (scope: FamilyScope, id: number) =>
	getChore(scope, id)!.copies.map((c) => c.status);

describe('daily reset', () => {
	it('puts completed and skipped copies of due chores back to pending, and leaves waiting ones', () => {
		resetFamily(ours, monNoon);
		const id = chore(ours, [mia, leo], { kind: 'daily' });
		setStatus('completed', mia);
		setStatus('waiting', leo);
		expect(resetFamily(ours, tue6)).toBe(1);
		expect(statuses(ours, id)).toEqual(['pending', 'waiting']);

		setStatus('skipped', mia);
		expect(resetFamily(ours, wed6)).toBe(1);
		expect(statuses(ours, id)).toEqual(['pending', 'waiting']);
	});

	it('waits for 6:00 am, then runs once per chore day', () => {
		resetFamily(ours, monNoon);
		const id = chore(ours, [mia], { kind: 'daily' });
		setStatus('completed', mia);
		expect(resetFamily(ours, tue559)).toBeNull();
		expect(statuses(ours, id)).toEqual(['completed']);
		expect(resetFamily(ours, tue6)).toBe(1);
		// Finishing it again later the same day is not undone by the next check.
		setStatus('completed', mia);
		expect(resetFamily(ours, new Date(tue6.getTime() + 60_000))).toBeNull();
		expect(statuses(ours, id)).toEqual(['completed']);
	});

	it('leaves chores that are not due today', () => {
		resetFamily(ours, monNoon);
		// Monday only: done on Monday, still done on Tuesday, pending again next Monday.
		const id = chore(ours, [mia], { kind: 'weekly', days: [0] });
		setStatus('completed', mia);
		resetFamily(ours, tue6);
		expect(statuses(ours, id)).toEqual(['completed']);
		resetFamily(ours, new Date('2026-11-22T19:00:00Z'));
		expect(statuses(ours, id)).toEqual(['pending']);
	});

	it('never brings back a Once chore', () => {
		resetFamily(ours, monNoon);
		const id = chore(ours, [mia], { kind: 'once', date: '2026-11-16' });
		setStatus('completed', mia);
		resetFamily(ours, tue6);
		resetFamily(ours, wed6);
		expect(statuses(ours, id)).toEqual(['completed']);
	});

	it('catches up a missed reset when the app starts', () => {
		resetFamily(ours, monNoon);
		const id = chore(ours, [mia], { kind: 'daily' });
		setStatus('completed', mia);
		// The app was stopped over Tuesday's 6:00 am and starts again at 9:00 am.
		resetAll(opened.db, new Date('2026-11-16T22:00:00Z'));
		expect(statuses(ours, id)).toEqual(['pending']);
	});

	it('logs each reset', () => {
		resetFamily(ours, monNoon);
		chore(ours, [mia, leo], { kind: 'daily' });
		setStatus('completed', mia);
		setStatus('completed', leo);
		resetFamily(ours, tue6);
		const rows = opened.db
			.select()
			.from(schema.choreReset)
			.where(ours.where(schema.choreReset))
			.all();
		expect(rows.map((r) => [r.choreDay, r.copiesReset])).toEqual([
			['2026-11-16', 0],
			['2026-11-17', 2]
		]);
		expect(rows[1].ranAt).toEqual(tue6);
	});

	it('never touches stars', () => {
		resetFamily(ours, monNoon);
		chore(ours, [mia], { kind: 'daily' });
		addStars(ours, { childId: mia, amount: 10, kind: 'chore' });
		setStatus('completed', mia);
		resetFamily(ours, tue6);
		expect(balance(ours, mia)).toBe(10);
	});

	it("one family's reset never touches another's chores", () => {
		resetFamily(ours, monNoon);
		resetFamily(theirs, monNoon);
		const id = chore(theirs, [sam], { kind: 'daily' });
		setStatus('completed', sam);
		resetFamily(ours, tue6);
		expect(statuses(theirs, id)).toEqual(['completed']);
		resetFamily(theirs, tue6);
		expect(statuses(theirs, id)).toEqual(['pending']);
	});
});
