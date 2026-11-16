import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { NotInFamily, forFamily, type FamilyScope } from './family';
import { addStars, balance, history, moveStars, removeStars, standing } from './stars';

let opened: ReturnType<typeof openDatabase>;
let ours: FamilyScope;
let theirs: FamilyScope;

beforeEach(() => {
	opened = openDatabase(':memory:');
	const { db } = opened;
	const [a, b] = db.insert(schema.family).values([{ name: 'Ours' }, { name: 'Theirs' }]).returning().all();
	ours = forFamily(db, a.id);
	theirs = forFamily(db, b.id);
});
afterEach(() => opened.sqlite.close());

describe('family scope', () => {
	it('lists only its own children', () => {
		ours.addChild('Mia');
		theirs.addChild('Sam');
		expect(ours.children().map((c) => c.name)).toEqual(['Mia']);
		expect(theirs.children().map((c) => c.name)).toEqual(['Sam']);
	});

	it("cannot see another family's child", () => {
		const sam = theirs.addChild('Sam');
		expect(ours.child(sam.id)).toBeNull();
		expect(() => ours.requireChild(sam.id)).toThrow(NotInFamily);
	});

	it('refuses a bad family id', () => {
		expect(() => forFamily(opened.db, 0)).toThrow();
		expect(() => forFamily(opened.db, Number.NaN)).toThrow();
	});
});

describe('star ledger', () => {
	it('sums chores and bonuses, and takes rewards away', () => {
		const mia = ours.addChild('Mia');
		addStars(ours, { childId: mia.id, kind: 'chore', amount: 10, sourceId: 1 });
		addStars(ours, { childId: mia.id, kind: 'bonus', amount: 20 });
		addStars(ours, { childId: mia.id, kind: 'reward', amount: 25, sourceId: 7 });
		expect(balance(ours, mia.id)).toBe(5);
	});

	it('starts at 0 stars and Cadet', () => {
		const mia = ours.addChild('Mia');
		expect(standing(ours, mia.id)).toMatchObject({ stars: 0, rank: 'Cadet' });
	});

	it('drops a rank when a reward is handed out', () => {
		const mia = ours.addChild('Mia');
		addStars(ours, { childId: mia.id, kind: 'chore', amount: 120 });
		expect(standing(ours, mia.id).rank).toBe('Explorer');
		addStars(ours, { childId: mia.id, kind: 'reward', amount: 90 });
		expect(standing(ours, mia.id)).toMatchObject({ stars: 30, rank: 'Cadet' });
	});

	it('refuses amounts that are not whole numbers above 0', () => {
		const mia = ours.addChild('Mia');
		for (const amount of [0, -5, 1.5, Number.NaN])
			expect(() => addStars(ours, { childId: mia.id, kind: 'chore', amount })).toThrow();
	});

	it('undo deletes the rows from that source and leaves the rest', () => {
		const mia = ours.addChild('Mia');
		addStars(ours, { childId: mia.id, kind: 'chore', amount: 10, sourceId: 1 });
		addStars(ours, { childId: mia.id, kind: 'chore', amount: 15, sourceId: 2 });
		expect(removeStars(ours, 'chore', 1)).toBe(1);
		expect(balance(ours, mia.id)).toBe(15);
		expect(history(ours, mia.id)).toHaveLength(1);
	});

	it('moves a chore and its stars to the right child', () => {
		const mia = ours.addChild('Mia');
		const leo = ours.addChild('Leo');
		addStars(ours, { childId: mia.id, kind: 'chore', amount: 10, sourceId: 3 });
		expect(moveStars(ours, 'chore', 3, leo.id)).toBe(1);
		expect(balance(ours, mia.id)).toBe(0);
		expect(balance(ours, leo.id)).toBe(10);
	});

	it('lists history newest first', () => {
		const mia = ours.addChild('Mia');
		addStars(ours, { childId: mia.id, kind: 'chore', amount: 10 });
		addStars(ours, { childId: mia.id, kind: 'bonus', amount: 20 });
		expect(history(ours, mia.id).map((e) => e.kind)).toEqual(['bonus', 'chore']);
	});
});

describe('one family cannot reach another family\'s stars', () => {
	it('cannot add stars to, read, or list history for their child', () => {
		const sam = theirs.addChild('Sam');
		expect(() => addStars(ours, { childId: sam.id, kind: 'chore', amount: 10 })).toThrow(NotInFamily);
		expect(() => balance(ours, sam.id)).toThrow(NotInFamily);
		expect(() => history(ours, sam.id)).toThrow(NotInFamily);
	});

	it('cannot undo their stars', () => {
		const sam = theirs.addChild('Sam');
		addStars(theirs, { childId: sam.id, kind: 'chore', amount: 10, sourceId: 5 });
		expect(removeStars(ours, 'chore', 5)).toBe(0);
		expect(balance(theirs, sam.id)).toBe(10);
	});

	it('cannot move their stars, or move ours to their child', () => {
		const mia = ours.addChild('Mia');
		const sam = theirs.addChild('Sam');
		addStars(theirs, { childId: sam.id, kind: 'chore', amount: 10, sourceId: 5 });
		addStars(ours, { childId: mia.id, kind: 'chore', amount: 7, sourceId: 6 });

		const leo = ours.addChild('Leo');
		expect(moveStars(ours, 'chore', 5, leo.id)).toBe(0);
		expect(balance(theirs, sam.id)).toBe(10);

		expect(() => moveStars(ours, 'chore', 6, sam.id)).toThrow(NotInFamily);
		expect(balance(ours, mia.id)).toBe(7);
	});
});
