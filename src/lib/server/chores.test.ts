import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { forFamily, NotInFamily, type FamilyScope } from './family';
import { addChore, BadRepeat, getChore, listChores, removeChore, updateChore } from './chores';
import { addStars, balance } from './stars';
import { parseChore, type ChoreInput } from './forms/chores';

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

const toyBox = (childIds: number[]) => ({
	name: 'Tidy the toy box',
	icon: 'toys' as const,
	stars: 10,
	childIds,
	repeat: { kind: 'daily' } as ChoreInput['repeat']
});

describe('chores library', () => {
	it('gives each assigned child their own copy', () => {
		const id = addChore(ours, toyBox([mia, leo]));
		const chore = getChore(ours, id)!;
		expect(chore.copies).toEqual([
			{ childId: mia, status: 'pending' },
			{ childId: leo, status: 'pending' }
		]);
	});

	it('lists chores newest first, including ones nobody does', () => {
		addChore(ours, toyBox([mia]));
		addChore(ours, { ...toyBox([]), name: 'Wash the car' });
		expect(listChores(ours).map((c) => [c.name, c.childIds])).toEqual([
			['Wash the car', []],
			['Tidy the toy box', [mia]]
		]);
	});

	it('editing adds and removes copies, and keeps the others with their status', () => {
		const id = addChore(ours, toyBox([mia]));
		opened.sqlite.prepare("update chore_copy set status = 'completed' where child_id = ?").run(mia);
		updateChore(ours, id, { ...toyBox([mia, leo]), stars: 15 });
		expect(getChore(ours, id)!.copies).toEqual([
			{ childId: mia, status: 'completed' },
			{ childId: leo, status: 'pending' }
		]);
		updateChore(ours, id, toyBox([leo]));
		expect(getChore(ours, id)!.childIds).toEqual([leo]);
		expect(getChore(ours, id)!.stars).toBe(10);
	});

	it('removing a chore removes every copy, and earned stars stay', () => {
		const id = addChore(ours, toyBox([mia]));
		const copy = getChore(ours, id)!;
		addStars(ours, { childId: mia, kind: 'chore', amount: 10, sourceId: copy.id });
		expect(removeChore(ours, id)).toBe(true);
		expect(getChore(ours, id)).toBeNull();
		expect(opened.db.select().from(schema.choreCopy).all()).toEqual([]);
		expect(balance(ours, mia)).toBe(10);
	});
});

describe("one family cannot reach another's chores", () => {
	it('cannot read, edit or remove them', () => {
		const id = addChore(theirs, { ...toyBox([sam]), name: 'Feed the cat' });
		expect(getChore(ours, id)).toBeNull();
		expect(listChores(ours)).toEqual([]);
		expect(updateChore(ours, id, toyBox([mia]))).toBe(false);
		expect(removeChore(ours, id)).toBe(false);
		expect(getChore(theirs, id)!.name).toBe('Feed the cat');
		expect(getChore(theirs, id)!.childIds).toEqual([sam]);
	});

	it("cannot assign another family's child", () => {
		expect(() => addChore(ours, toyBox([sam]))).toThrow(NotInFamily);
		const id = addChore(ours, toyBox([mia]));
		expect(() => updateChore(ours, id, toyBox([mia, sam]))).toThrow(NotInFamily);
		expect(getChore(ours, id)!.childIds).toEqual([mia]);
	});
});

describe('repeats', () => {
	// 10:00 am Tuesday 17 Nov 2026, Melbourne.
	const tue = new Date('2026-11-16T23:00:00Z');
	const wed = new Date('2026-11-17T23:00:00Z');

	it('saves and reads back every kind', () => {
		const kinds: ChoreInput['repeat'][] = [
			{ kind: 'daily' },
			{ kind: 'weekly', days: [0, 2, 4] },
			{ kind: 'monthly', day: 31 },
			{ kind: 'once', date: '2026-11-22' }
		];
		for (const repeat of kinds) {
			const id = addChore(ours, { ...toyBox([mia]), repeat }, tue);
			expect(getChore(ours, id)!.repeat).toEqual(repeat);
		}
	});

	it('custom counts from the day it is saved, and keeps that day when other fields change', () => {
		const repeat = { kind: 'custom', every: 3, unit: 'days' } as const;
		const id = addChore(ours, { ...toyBox([mia]), repeat }, tue);
		expect(getChore(ours, id)!.repeat).toEqual({ ...repeat, start: '2026-11-17' });
		updateChore(ours, id, { ...toyBox([mia]), name: 'Toys away', repeat }, wed);
		expect(getChore(ours, id)!.repeat).toMatchObject({ start: '2026-11-17' });
		updateChore(ours, id, { ...toyBox([mia]), repeat: { ...repeat, every: 2 } }, wed);
		expect(getChore(ours, id)!.repeat).toMatchObject({ start: '2026-11-18' });
	});

	it('Once must be today or in the next 6 days, unless the date is unchanged', () => {
		const once = (date: string) => ({ ...toyBox([mia]), repeat: { kind: 'once', date } as const });
		expect(() => addChore(ours, once('2026-11-16'), tue)).toThrow(BadRepeat);
		expect(() => addChore(ours, once('2026-11-24'), tue)).toThrow(BadRepeat);
		const id = addChore(ours, once('2026-11-23'), tue);
		// A week later the date has passed, but editing the name keeps it.
		const later = new Date('2026-11-30T23:00:00Z');
		expect(updateChore(ours, id, { ...once('2026-11-23'), name: 'Toys away' }, later)).toBe(true);
		expect(() => updateChore(ours, id, once('2026-11-24'), later)).toThrow(BadRepeat);
	});
});

describe('chore form checks', () => {
	const ok = {
		name: 'Water the plants',
		icon: 'bed',
		stars: 10,
		childIds: [1, 2],
		repeat: { kind: 'daily' }
	};

	it('accepts every kind of repeat', () => {
		for (const repeat of [
			{ kind: 'weekly', days: [0, 6] },
			{ kind: 'monthly', day: 1 },
			{ kind: 'custom', every: 30, unit: 'weeks' },
			{ kind: 'once', date: '2026-02-28' }
		])
			expect(parseChore({ ...ok, repeat }), JSON.stringify(repeat)).not.toBeNull();
	});

	it('accepts a normal chore, with emoji or accents', () => {
		expect(parseChore(ok)).toEqual(ok);
		expect(parseChore({ ...ok, name: 'Feed Biscuit 🐶' })).not.toBeNull();
		expect(parseChore({ ...ok, name: 'Ranger la chambre, s’il te plaît' })).not.toBeNull();
	});

	it('refuses anything else', () => {
		for (const bad of [
			{ ...ok, name: '' },
			{ ...ok, name: ' padded ' },
			{ ...ok, name: 'x'.repeat(41) },
			{ ...ok, name: 'line\nbreak' },
			{ ...ok, name: 'zero​width' },
			{ ...ok, icon: 'rocket' },
			{ ...ok, stars: 0 },
			{ ...ok, stars: 7 },
			{ ...ok, stars: 105 },
			{ ...ok, stars: '10' },
			{ ...ok, childIds: [1, 1] },
			{ ...ok, childIds: [1, 2, 3, 4, 5] },
			{ ...ok, childIds: [-1] },
			{ name: 'No icon', stars: 10, childIds: [], repeat: { kind: 'daily' } },
			{ ...ok, repeat: undefined },
			{ ...ok, repeat: { kind: 'yearly' } },
			{ ...ok, repeat: { kind: 'weekly', days: [] } },
			{ ...ok, repeat: { kind: 'weekly', days: [7] } },
			{ ...ok, repeat: { kind: 'weekly', days: [1, 1] } },
			{ ...ok, repeat: { kind: 'monthly', day: 0 } },
			{ ...ok, repeat: { kind: 'monthly', day: 32 } },
			{ ...ok, repeat: { kind: 'custom', every: 0, unit: 'days' } },
			{ ...ok, repeat: { kind: 'custom', every: 31, unit: 'days' } },
			{ ...ok, repeat: { kind: 'custom', every: 2, unit: 'months' } },
			{ ...ok, repeat: { kind: 'once', date: '2026-02-30' } },
			{ ...ok, repeat: { kind: 'once', date: 'tomorrow' } },
			null,
			'chore'
		])
			expect(parseChore(bad), JSON.stringify(bad)).toBeNull();
	});
});
