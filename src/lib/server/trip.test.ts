import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { addChore } from './chores';
import { comingUp, openStop, tripStops } from './trip';
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

// 10:00 am Tuesday 17 Nov 2026, Melbourne.
const now = new Date('2026-11-16T23:00:00Z');

function chore(
	name: string,
	childIds: number[],
	repeat: ChoreInput['repeat'] = { kind: 'daily' },
	scope = ours
) {
	return addChore(scope, { name, expectations: '', icon: 'bed', stars: 10, childIds, repeat }, now);
}

const setStatus = (choreId: number, childId: number, status: string) =>
	opened.sqlite
		.prepare('update chore_copy set status = ? where chore_id = ? and child_id = ?')
		.run(status, choreId, childId);

const path = (childId: number) => tripStops(ours, childId, now).map((s) => [s.name, s.state]);

describe('the trip', () => {
	it('shows only the child’s own stops due today, not skipped ones', () => {
		chore('Make your bed', [mia, leo]);
		chore('Feed the dog', [leo]);
		chore('Bins', [mia], { kind: 'weekly', days: [3] }); // Thursday
		const skipped = chore('Read', [mia]);
		setStatus(skipped, mia, 'skipped');
		expect(path(mia)).toEqual([['Make your bed', 'next']]);
	});

	it('orders done, then waiting, then the rest, with the first of the rest up next', () => {
		const bed = chore('Make your bed', [mia]);
		const dog = chore('Feed the dog', [mia]);
		chore('Tidy the toy box', [mia]);
		chore('Read', [mia]);
		const table = chore('Set the table', [mia]);
		setStatus(table, mia, 'completed');
		setStatus(bed, mia, 'waiting');
		setStatus(dog, mia, 'completed');
		expect(path(mia)).toEqual([
			['Feed the dog', 'done'],
			['Set the table', 'done'],
			['Make your bed', 'waiting'],
			['Tidy the toy box', 'next'],
			['Read', 'open']
		]);
	});

	it('Coming up lists the next 6 days, soonest first, and not today’s', () => {
		chore('Make your bed', [mia]);
		chore('Library books', [mia], { kind: 'weekly', days: [5] }); // Saturday
		chore('Bins', [mia], { kind: 'weekly', days: [3] }); // Thursday
		chore('Next Tuesday', [mia], { kind: 'weekly', days: [1] }); // today, so not coming up
		chore('Monthly', [mia], { kind: 'monthly', day: 1 }); // 1 Dec, too far
		chore('Leo’s', [leo], { kind: 'weekly', days: [3] });
		expect(comingUp(ours, mia, now).map((c) => [c.name, c.day])).toEqual([
			['Bins', 'Thursday'],
			['Library books', 'Saturday']
		]);
	});

	it('opens only the child’s own unfinished stops for today', () => {
		const bed = chore('Make your bed', [mia]);
		const dog = chore('Feed the dog', [mia]);
		const bins = chore('Bins', [mia], { kind: 'weekly', days: [3] });
		const leos = chore('Leo’s', [leo]);
		setStatus(dog, mia, 'waiting');
		expect(openStop(ours, mia, bed, now)).toMatchObject({
			name: 'Make your bed',
			repeats: 'Every day'
		});
		expect(openStop(ours, mia, dog, now)).toBeNull();
		expect(openStop(ours, mia, bins, now)).toBeNull();
		expect(openStop(ours, mia, leos, now)).toBeNull();
		expect(openStop(ours, mia, NaN, now)).toBeNull();
	});
});

describe("one family cannot see another's trip", () => {
	it('never shows or opens another family’s chores', () => {
		const theirChore = chore('Feed the cat', [sam], { kind: 'daily' }, theirs);
		expect(tripStops(ours, sam, now)).toEqual([]);
		expect(comingUp(ours, sam, now)).toEqual([]);
		expect(openStop(ours, sam, theirChore, now)).toBeNull();
		expect(openStop(ours, mia, theirChore, now)).toBeNull();
	});
});
