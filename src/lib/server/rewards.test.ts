import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { forFamily, NotInFamily, type FamilyScope } from './family';
import {
	addReward,
	childRewards,
	getReward,
	listRewards,
	reachedReward,
	removeReward,
	updateReward
} from './rewards';
import { parseReward } from './forms/rewards';
import { addStars, balance } from './stars';
import { familyVersion } from './live';
import { meter } from '../rewards';

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

const reward = (
	name: string,
	cost: number,
	childIds: number[],
	scope = ours,
	colour: 'pink' | 'purple' | 'green' | 'tan' | 'blue' = 'pink'
) => addReward(scope, { name, cost, colour, childIds });

const stars = (childId: number, amount: number, scope = ours) =>
	addStars(scope, { childId, kind: 'chore', amount });

describe('the meter', () => {
	it('shows how far, how many to go, and ready', () => {
		expect(meter(128, 150)).toEqual({ ready: false, percent: 85, toGo: 22 });
		expect(meter(100, 100)).toEqual({ ready: true, percent: 100, toGo: 0 });
		expect(meter(500, 100)).toEqual({ ready: true, percent: 100, toGo: 0 });
		expect(meter(0, 90)).toEqual({ ready: false, percent: 0, toGo: 90 });
	});
});

describe('the rewards library', () => {
	it('lists rewards oldest first, with a meter for each child they are for', () => {
		stars(mia, 128);
		stars(leo, 4);
		reward('Movie night', 150, [mia]);
		reward('Extra screen time', 100, [mia, leo]);
		expect(
			listRewards(ours).map((r) => [r.name, r.children.map((c) => [c.name, c.stars])])
		).toEqual([
			['Movie night', [['Mia', 128]]],
			[
				'Extra screen time',
				[
					['Mia', 128],
					['Leo', 4]
				]
			]
		]);
	});

	it('adds, changes and removes a reward, and who it is for', () => {
		const id = reward('Park trip', 90, [mia]);
		expect(getReward(ours, id)).toMatchObject({ name: 'Park trip', cost: 90, childIds: [mia] });
		expect(
			updateReward(ours, id, {
				name: 'Trip to the pool',
				cost: 250,
				colour: 'blue',
				childIds: [leo]
			})
		).toBe(true);
		expect(getReward(ours, id)).toEqual({
			id,
			name: 'Trip to the pool',
			cost: 250,
			colour: 'blue',
			photo: null,
			childIds: [leo]
		});
		expect(removeReward(ours, id)).toBe(true);
		expect(getReward(ours, id)).toBeNull();
		expect(removeReward(ours, id)).toBe(false);
		expect(opened.sqlite.prepare('select count(*) as n from reward_child').get()).toEqual({ n: 0 });
	});

	it('can be for nobody yet', () => {
		reward('Pizza night', 200, []);
		expect(listRewards(ours)[0].children).toEqual([]);
	});

	it('never changes anyone’s stars', () => {
		stars(mia, 50);
		const id = reward('Park trip', 90, [mia]);
		updateReward(ours, id, { name: 'Park trip', cost: 10, colour: 'pink', childIds: [] });
		removeReward(ours, id);
		expect(balance(ours, mia)).toBe(50);
	});
});

describe('My rewards', () => {
	it('lists only rewards for the child, ready first, then closest, then cheapest', () => {
		stars(mia, 128);
		reward('Pizza night', 200, [mia]);
		reward('Movie night', 150, [mia]);
		reward('Extra screen time', 100, [mia]);
		reward('Leo’s lego', 10, [leo]);
		reward('Cheap one', 5, [mia]);
		expect(childRewards(ours, mia).map((r) => r.name)).toEqual([
			'Cheap one',
			'Extra screen time',
			'Movie night',
			'Pizza night'
		]);
		expect(childRewards(ours, leo).map((r) => r.name)).toEqual(['Leo’s lego']);
	});

	it('finds the dearest reward a child can afford', () => {
		stars(leo, 100);
		reward('Park trip', 90, [leo]);
		reward('Extra screen time', 100, [leo]);
		reward('Pizza night', 200, [leo]);
		expect(reachedReward(ours, leo)?.name).toBe('Extra screen time');
		expect(reachedReward(ours, mia)).toBeNull();
	});
});

describe('checking a reward', () => {
	it('accepts good input and refuses bad input', () => {
		const ok = { name: 'Movie night', cost: 150, colour: 'purple', childIds: [1, 2] };
		expect(parseReward(ok)).toEqual(ok);
		for (const bad of [
			{ ...ok, name: '' },
			{ ...ok, name: ' Movie night' },
			{ ...ok, name: 'x'.repeat(41) },
			{ ...ok, name: 'Bad\u0000name' },
			{ ...ok, cost: 0 },
			{ ...ok, cost: 1001 },
			{ ...ok, cost: 99.5 },
			{ ...ok, cost: '100' },
			{ ...ok, colour: 'red' },
			{ ...ok, childIds: [1, 1] },
			{ ...ok, childIds: [0] },
			{ ...ok, extra: 1, childIds: 'all' }
		])
			expect(parseReward(bad)).toBeNull();
	});
});

describe('live updates', () => {
	it('bumps only the changed family’s version', () => {
		const before = [familyVersion(ours), familyVersion(theirs)];
		const id = reward('Park trip', 90, [mia]);
		const afterAdd = familyVersion(ours);
		expect(afterAdd).toBeGreaterThan(before[0]);
		updateReward(ours, id, { name: 'Park trip', cost: 80, colour: 'pink', childIds: [mia, leo] });
		expect(familyVersion(ours)).toBeGreaterThan(afterAdd);
		expect(familyVersion(theirs)).toBe(before[1]);
	});
});

describe("one family cannot see or change another's rewards", () => {
	it('never lists, reads, changes, removes or assigns across families', () => {
		const theirId = reward('Their pizza', 200, [sam], theirs);
		stars(sam, 300, theirs);
		expect(listRewards(ours)).toEqual([]);
		expect(getReward(ours, theirId)).toBeNull();
		expect(
			updateReward(ours, theirId, { name: 'Mine now', cost: 1, colour: 'pink', childIds: [] })
		).toBe(false);
		expect(removeReward(ours, theirId)).toBe(false);
		expect(getReward(theirs, theirId)).toMatchObject({ name: 'Their pizza', cost: 200 });
		expect(() => reward('Mixed up', 10, [sam])).toThrow(NotInFamily);
		expect(() => childRewards(ours, sam)).toThrow(NotInFamily);
		expect(() => reachedReward(ours, sam)).toThrow(NotInFamily);
		expect(childRewards(theirs, sam).map((r) => r.name)).toEqual(['Their pizza']);
	});
});
