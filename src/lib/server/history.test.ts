import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { forFamily, NotInFamily, type FamilyScope } from './family';
import { addChore } from './chores';
import { accept, moveTo, undoAccept } from './check';
import { claimReward, handOut } from './claims';
import { addReward } from './rewards';
import { starHistory } from './history';
import { iDidIt } from './trip';

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
const at = (hours: number) => new Date(now.getTime() + hours * 3600_000);

function chore(name: string, childIds: number[], stars: number, scope = ours) {
	return addChore(
		scope,
		{ name, expectations: '', icon: 'paw', stars, childIds, repeat: { kind: 'daily' } },
		now
	);
}

/** Star rows are stamped with the real clock, so put new ones at the moment they stand for. */
function stampNewRows(when: Date, from: number) {
	opened.sqlite
		.prepare('UPDATE star_event SET created_at = ? WHERE id > ?')
		.run(Math.floor(when.getTime() / 1000), from);
}
const lastRow = () =>
	(
		opened.sqlite.prepare('SELECT COALESCE(MAX(id), 0) AS id FROM star_event').get() as {
			id: number;
		}
	).id;

/** The child does the chore and a grown-up accepts it at `when`. Returns the copy's id. */
function earn(choreId: number, childId: number, when: Date, scope = ours) {
	const from = lastRow();
	const sent = iDidIt(scope, childId, choreId, when)!;
	accept(scope, sent.copyId, when);
	stampNewRows(when, from);
	return sent.copyId;
}

describe('star history', () => {
	it('is empty before any star', () => {
		expect(starHistory(ours, mia)).toEqual([]);
	});

	it('groups by Melbourne day, newest first, with names, amounts and times', () => {
		const bed = chore('Make your bed', [mia], 10);
		const table = chore('Set the table', [mia], 15);
		earn(bed, mia, now); // 10:00 Tue 17 Nov
		earn(table, mia, at(1)); // 11:00, finishing the trip: +20 bonus
		const days = starHistory(ours, mia);
		expect(days).toHaveLength(1);
		expect(days[0]).toMatchObject({ date: '2026-11-17', label: 'Tue 17 Nov' });
		expect(days[0].items.map((i) => [i.name, i.amount, i.time])).toEqual([
			['Daily bonus', 20, '11:00'],
			['Set the table', 15, '11:00'],
			['Make your bed', 10, '10:00']
		]);
	});

	it('splits days at midnight in Melbourne, not UTC', () => {
		const bed = chore('Make your bed', [mia], 10);
		const table = chore('Set the table', [mia], 10);
		earn(bed, mia, new Date('2026-11-17T12:30:00Z')); // 23:30 Tue 17 Nov
		earn(table, mia, new Date('2026-11-17T13:30:00Z')); // 00:30 Wed 18 Nov, same day in UTC
		expect(
			starHistory(ours, mia).map((d) => [d.date, d.label, d.items.map((i) => i.time)])
		).toEqual([
			['2026-11-18', 'Wed 18 Nov', ['0:30', '0:30']],
			['2026-11-17', 'Tue 17 Nov', ['23:30']]
		]);
	});

	it('shows a reward handed out as a negative amount with its name', () => {
		const bed = chore('Make your bed', [mia], 10);
		const table = chore('Set the table', [mia], 15);
		earn(bed, mia, now);
		earn(table, mia, now);
		const movie = addReward(ours, {
			name: 'Movie night',
			cost: 30,
			colour: 'blue',
			childIds: [mia]
		});
		const claim = claimReward(ours, mia, movie)!;
		const from = lastRow();
		expect(handOut(ours, claim.id)).toBe('ok');
		stampNewRows(at(2), from);
		const [first] = starHistory(ours, mia)[0].items;
		expect(first).toMatchObject({ kind: 'reward', amount: -30, name: 'Movie night handed out' });
	});

	it('shows only what stands after Undo and "That wasn\'t Mia"', () => {
		const bed = chore('Make your bed', [mia, leo], 10);
		const table = chore('Set the table', [mia, leo], 10);
		const first = earn(bed, mia, now);
		const second = earn(table, mia, at(1)); // finishes Mia's trip: bonus
		expect(starHistory(ours, mia)[0].items.map((i) => i.name)).toContain('Daily bonus');
		// Undo of the finishing accept takes the chore row and the bonus away.
		expect(undoAccept(ours, second, at(1))).toBe(true);
		expect(starHistory(ours, mia)[0].items.map((i) => i.name)).toEqual(['Make your bed']);
		// "That wasn't Mia": the row moves to Leo's history.
		moveTo(ours, second, leo, at(2));
		expect(starHistory(ours, mia)[0].items.map((i) => i.name)).toEqual(['Make your bed']);
		expect(starHistory(ours, leo)[0].items.map((i) => i.name)).toEqual(['Set the table']);
		expect(first).toBeGreaterThan(0);
	});

	it('names a removed chore and a removed reward plainly', () => {
		opened.sqlite.exec('PRAGMA foreign_keys = OFF');
		ours.db
			.insert(schema.starEvent)
			.values([
				{ familyId: ours.familyId, childId: mia, kind: 'chore', amount: 5, sourceId: 999 },
				{ familyId: ours.familyId, childId: mia, kind: 'reward', amount: -5, sourceId: 999 }
			])
			.run();
		expect(
			starHistory(ours, mia)[0]
				.items.map((i) => i.name)
				.sort()
		).toEqual(['A removed chore', 'A removed reward handed out']);
	});

	it('never shows another family’s rows or names', () => {
		const theirChore = chore('Their secret chore', [sam], 10, theirs);
		earn(theirChore, sam, now, theirs);
		const bed = chore('Make your bed', [mia], 10);
		earn(bed, mia, now);
		expect(() => starHistory(ours, sam)).toThrow(NotInFamily);
		expect(() => starHistory(theirs, mia)).toThrow(NotInFamily);
		expect(JSON.stringify(starHistory(ours, mia))).not.toContain('secret');
		expect(starHistory(theirs, sam).flatMap((d) => d.items.map((i) => i.name))).toEqual(
			expect.arrayContaining(['Their secret chore'])
		);
	});

	it('does not take a name from another family’s chore with the same id', () => {
		// A star row in our family pointing at a copy id that exists only in theirs.
		const theirChore = chore('Their secret chore', [sam], 10, theirs);
		const sent = iDidIt(theirs, sam, theirChore, now)!;
		ours.db
			.insert(schema.starEvent)
			.values({
				familyId: ours.familyId,
				childId: mia,
				kind: 'chore',
				amount: 5,
				sourceId: sent.copyId
			})
			.run();
		expect(starHistory(ours, mia)[0].items[0].name).toBe('A removed chore');
	});
});
