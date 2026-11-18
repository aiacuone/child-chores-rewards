import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { addChore } from './chores';
import {
	accept,
	checkDetails,
	checkedNotice,
	clearCheckedNotices,
	moveTo,
	sendBack,
	toCheck,
	undoAccept
} from './check';
import { iDidIt, tripStops } from './trip';
import { addStars, balance, history } from './stars';
import { resetFamily } from './reset';

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
const later = (seconds: number) => new Date(now.getTime() + seconds * 1000);

function chore(name: string, childIds: number[], stars = 15, scope = ours) {
	return addChore(
		scope,
		{ name, expectations: '', icon: 'paw', stars, childIds, repeat: { kind: 'daily' } },
		now
	);
}

/** The child taps "I did it!"; returns their copy's id. */
function done(choreId: number, childId: number, scope = ours) {
	const sent = iDidIt(scope, childId, choreId, now);
	if (!sent) throw new Error('not sent');
	return sent.copyId;
}

const state = (childId: number) => tripStops(ours, childId, now).map((s) => [s.name, s.state]);

describe('accepting', () => {
	it('completes the chore, adds its stars once, and queues "checked!"', () => {
		const copy = done(chore('Feed Biscuit the dog', [mia]), mia);
		expect(toCheck(ours).map((c) => [c.name, c.childName])).toEqual([
			['Feed Biscuit the dog', 'Mia']
		]);
		expect(accept(ours, copy, now)).toBe(true);
		expect(accept(ours, copy, now)).toBe(false);
		// 15 for the chore, and the daily bonus: it was Mia's only stop.
		expect(balance(ours, mia)).toBe(35);
		expect(state(mia)).toEqual([['Feed Biscuit the dog', 'done']]);
		expect(toCheck(ours)).toEqual([]);
		expect(checkedNotice(ours, mia)).toMatchObject({ name: 'Feed Biscuit the dog', stars: 15 });
	});

	it('undo within the minute takes back only that accept’s stars', () => {
		const dog = chore('Feed Biscuit the dog', [mia]);
		const copy = done(dog, mia);
		// Stars from the same chore on an earlier day.
		addStars(ours, { childId: mia, kind: 'chore', amount: 15, sourceId: copy });
		accept(ours, copy, now);
		expect(checkDetails(ours, copy, later(8))?.undoLeft).toBe(52);
		expect(undoAccept(ours, copy, later(59))).toBe(true);
		expect(balance(ours, mia)).toBe(15);
		expect(state(mia)).toEqual([['Feed Biscuit the dog', 'waiting']]);
		expect(checkedNotice(ours, mia)).toBeNull();
	});

	it('refuses undo after the minute', () => {
		const copy = done(chore('Feed Biscuit the dog', [mia]), mia);
		accept(ours, copy, now);
		expect(undoAccept(ours, copy, later(75))).toBe(false);
		expect(balance(ours, mia)).toBe(35);
	});

	it('shows "checked!" once', () => {
		const copy = done(chore('Feed Biscuit the dog', [mia]), mia);
		accept(ours, copy, now);
		const notice = checkedNotice(ours, mia)!;
		expect(checkedNotice(ours, mia)).toEqual(notice);
		clearCheckedNotices(ours, mia, notice.id);
		expect(checkedNotice(ours, mia)).toBeNull();
	});
});

describe('sending back', () => {
	it('opens the stop again with the message, until "I did it!"', () => {
		const dog = chore('Feed Biscuit the dog', [mia]);
		const copy = done(dog, mia);
		expect(sendBack(ours, copy, 'Almost! Give it another go')).toBe(true);
		expect(tripStops(ours, mia, now)[0]).toMatchObject({
			state: 'next',
			message: 'Almost! Give it another go'
		});
		expect(sendBack(ours, copy, 'Again')).toBe(false);
		done(dog, mia);
		expect(tripStops(ours, mia, now)[0].message).toBeNull();
		expect(balance(ours, mia)).toBe(0);
	});

	it('the daily reset clears an unseen "checked!", even with nothing due', () => {
		const tuesdays = addChore(
			ours,
			{
				name: 'Wash the car',
				expectations: '',
				icon: 'paw',
				stars: 15,
				childIds: [mia],
				repeat: { kind: 'weekly', days: [1] }
			},
			now
		);
		accept(ours, done(tuesdays, mia), now);
		// 7:00 am Wednesday: nothing is due.
		expect(resetFamily(ours, new Date('2026-11-17T20:00:00Z'))).toBe(0);
		expect(checkedNotice(ours, mia)).toBeNull();
		expect(balance(ours, mia)).toBe(35);
	});

	it('the daily reset clears old messages', () => {
		const copy = done(chore('Feed Biscuit the dog', [mia]), mia);
		sendBack(ours, copy, 'Almost! Give it another go');
		resetFamily(ours, new Date('2026-11-17T20:00:00Z'));
		expect(tripStops(ours, mia, new Date('2026-11-17T20:00:00Z'))[0].message).toBeNull();
	});
});

describe('"That wasn’t Mia"', () => {
	it('gives the stars to a child who is not assigned, without adding the chore to their trip', () => {
		const dog = chore('Feed Biscuit the dog', [mia]);
		const copy = done(dog, mia);
		expect(moveTo(ours, copy, leo, now)).toBe(true);
		expect(balance(ours, leo)).toBe(15);
		expect(balance(ours, mia)).toBe(0);
		expect(state(mia)).toEqual([['Feed Biscuit the dog', 'next']]);
		expect(state(leo)).toEqual([]);
		expect(history(ours, leo)).toMatchObject([{ kind: 'chore', amount: 15, sourceId: copy }]);
	});

	it('leaves the moved stars alone when Mia’s own accept is undone later', () => {
		const dog = chore('Feed Biscuit the dog', [mia]);
		const copy = done(dog, mia);
		moveTo(ours, copy, leo, now);
		done(dog, mia);
		accept(ours, copy, now);
		undoAccept(ours, copy, later(5));
		expect(balance(ours, leo)).toBe(15);
		expect(balance(ours, mia)).toBe(0);
	});

	it('shows Done on the right child’s trip when they are assigned', () => {
		const dog = chore('Feed Biscuit the dog', [mia, leo]);
		const copy = done(dog, mia);
		moveTo(ours, copy, leo, now);
		expect(state(leo)).toEqual([['Feed Biscuit the dog', 'done']]);
		expect(state(mia)).toEqual([['Feed Biscuit the dog', 'next']]);
		expect(checkedNotice(ours, leo)).toMatchObject({ stars: 15 });
	});

	it('refuses the same child, or a child from another family', () => {
		const copy = done(chore('Feed Biscuit the dog', [mia]), mia);
		expect(moveTo(ours, copy, mia, now)).toBe(false);
		expect(moveTo(ours, copy, sam, now)).toBe(false);
		expect(balance(theirs, sam)).toBe(0);
	});
});

describe('one family cannot check another’s chores', () => {
	it('never lists, reads or answers them', () => {
		const theirCopy = done(chore('Feed the cat', [sam], 10, theirs), sam, theirs);
		expect(toCheck(ours)).toEqual([]);
		expect(checkDetails(ours, theirCopy)).toBeNull();
		expect(accept(ours, theirCopy, now)).toBe(false);
		expect(sendBack(ours, theirCopy, 'No')).toBe(false);
		expect(moveTo(ours, theirCopy, mia, now)).toBe(false);
		expect(balance(theirs, sam)).toBe(0);
		expect(balance(ours, mia)).toBe(0);
		expect(tripStops(theirs, sam, now)[0].state).toBe('waiting');
		accept(theirs, theirCopy, now);
		expect(undoAccept(ours, theirCopy, now)).toBe(false);
		expect(balance(theirs, sam)).toBe(30);
	});
});
