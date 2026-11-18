import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { addChore, removeChore } from './chores';
import { accept, moveTo, undoAccept } from './check';
import { bonusToday, settleBonus, settleFamilyBonuses } from './bonus';
import { iDidIt } from './trip';
import { balance, history } from './stars';

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

function chore(name: string, childIds: number[], scope = ours) {
	return addChore(
		scope,
		{ name, expectations: '', icon: 'bed', stars: 10, childIds, repeat: { kind: 'daily' } },
		now
	);
}

/** The child taps "I did it!" and a grown-up accepts it; returns the copy. */
function finish(choreId: number, childId: number, scope = ours) {
	const sent = iDidIt(scope, childId, choreId, now)!;
	accept(scope, sent.copyId, now);
	return sent.copyId;
}

const bonuses = (childId: number) => history(ours, childId).filter((r) => r.kind === 'bonus');

describe('the daily bonus', () => {
	it('is earned once, when the last stop is accepted', () => {
		const bed = chore('Make your bed', [mia]);
		const dog = chore('Feed Biscuit the dog', [mia]);
		finish(bed, mia);
		expect(bonusToday(ours, mia, now)).toBeNull();
		finish(dog, mia);
		expect(bonusToday(ours, mia, now)).toEqual({ stars: 20 });
		expect(balance(ours, mia)).toBe(40);
		expect(settleBonus(ours, mia, now)).toBe(false);
		expect(bonuses(mia)).toHaveLength(1);
	});

	it('waits while a stop is still Grown-up checking', () => {
		const bed = chore('Make your bed', [mia]);
		iDidIt(ours, mia, bed, now);
		expect(settleBonus(ours, mia, now)).toBe(false);
		expect(bonusToday(ours, mia, now)).toBeNull();
	});

	it('is not blocked by a skipped chore', () => {
		const bed = chore('Make your bed', [mia]);
		const car = chore('Wash the car', [mia]);
		opened.sqlite.prepare("update chore_copy set status = 'skipped' where chore_id = ?").run(car);
		finish(bed, mia);
		expect(bonusToday(ours, mia, now)).toEqual({ stars: 20 });
	});

	it('goes when the accept that finished the trip is undone', () => {
		const bed = chore('Make your bed', [mia]);
		const copy = finish(bed, mia);
		undoAccept(ours, copy, new Date(now.getTime() + 5000));
		expect(bonusToday(ours, mia, now)).toBeNull();
		expect(balance(ours, mia)).toBe(0);
	});

	it('stays when a chore is added later in the day', () => {
		finish(chore('Make your bed', [mia]), mia);
		chore('Set the table', [mia]);
		settleFamilyBonuses(ours, now);
		expect(bonusToday(ours, mia, now)).toEqual({ stars: 20 });
	});

	it('is earned when removing the last open chore leaves the trip all Done', () => {
		finish(chore('Make your bed', [mia]), mia);
		const table = chore('Set the table', [mia]);
		removeChore(ours, table);
		settleFamilyBonuses(ours, now);
		expect(bonusToday(ours, mia, now)).toEqual({ stars: 20 });
	});

	it('goes to the right child when "That wasn’t Mia" finishes their trip', () => {
		const dog = chore('Feed Biscuit the dog', [mia, leo]);
		const sent = iDidIt(ours, mia, dog, now)!;
		moveTo(ours, sent.copyId, leo, now);
		expect(bonusToday(ours, leo, now)).toEqual({ stars: 20 });
		expect(bonusToday(ours, mia, now)).toBeNull();
	});

	it('is earned again on the next chore day', () => {
		const bed = chore('Make your bed', [mia]);
		finish(bed, mia);
		const tomorrow = new Date('2026-11-17T23:00:00Z');
		opened.sqlite.prepare("update chore_copy set status = 'completed'").run();
		expect(settleBonus(ours, mia, tomorrow)).toBe(true);
		expect(bonuses(mia).map((r) => r.sourceId)).toEqual([20261118, 20261117]);
	});

	it('never looks at another family’s children', () => {
		finish(chore('Feed the cat', [sam], theirs), sam, theirs);
		expect(bonusToday(theirs, sam, now)).toEqual({ stars: 20 });
		expect(settleBonus(ours, sam, now)).toBe(false);
		expect(bonusToday(ours, sam, now)).toBeNull();
		settleFamilyBonuses(ours, now);
		expect(balance(theirs, sam)).toBe(30);
	});
});
