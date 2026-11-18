import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { childCard, childCards } from './flying';
import { addStars } from './stars';

let opened: ReturnType<typeof openDatabase>;
let ours: FamilyScope;
let theirs: FamilyScope;

beforeEach(() => {
	opened = openDatabase(':memory:');
	const [a, b] = opened.db
		.insert(schema.family)
		.values([{ name: 'Ours' }, { name: 'Theirs' }])
		.returning()
		.all();
	ours = forFamily(opened.db, a.id);
	theirs = forFamily(opened.db, b.id);
});
afterEach(() => opened.sqlite.close());

describe("Who's flying cards", () => {
	it('shows each child with their colour, rank and stars', () => {
		const mia = ours.addChild('Mia', 'pink');
		ours.addChild('Leo', 'blue');
		addStars(ours, { childId: mia.id, kind: 'chore', amount: 120 });
		expect(childCards(ours)).toEqual([
			{ id: mia.id, name: 'Mia', colour: '#F28AA0', rank: 'Explorer', stars: 120, photo: null },
			expect.objectContaining({ name: 'Leo', colour: '#6EC6F0', rank: 'Cadet', stars: 0 })
		]);
	});

	it("never shows another family's children", () => {
		ours.addChild('Mia', 'pink');
		const sam = theirs.addChild('Sam', 'green');
		expect(childCards(ours).map((c) => c.name)).toEqual(['Mia']);
		expect(childCard(ours, sam.id)).toBeNull();
	});

	it('refuses ids that are not whole numbers above 0', () => {
		for (const id of [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])
			expect(childCard(ours, id)).toBeNull();
	});
});
