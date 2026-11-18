import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { PictureId } from '../passcode';
import { addChild, childDetail, listChildren, removeChild, updateChild } from './children';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { parseNewPasscode, parsePasscodeTry } from './forms/passcode';
import { MESSAGES, parseChild } from './forms/setup';
import { familyVersion } from './live';
import {
	OPEN_MS,
	WAIT_MS,
	closeTrips,
	hasPasscode,
	passcodeChildIds,
	removePasscode,
	setPasscode,
	tripOpen,
	tryPasscode,
	waitSeconds
} from './passcode';
import { addStars, balance } from './stars';

const RIGHT: PictureId[] = ['rocket', 'star', 'paw'];
const WRONG: PictureId[] = ['paw', 'star', 'rocket'];
const NOW = 1_800_000_000_000;

let opened: ReturnType<typeof openDatabase>;
let ours: FamilyScope;
let theirs: FamilyScope;
let mia: number;
let leo: number;
let sam: number;
const DEVICE = 'device-a';
const OTHER_DEVICE = 'device-b';

beforeEach(() => {
	opened = openDatabase(':memory:');
	const db = opened.db;
	const [a, b] = db
		.insert(schema.family)
		.values([{ name: 'Ours' }, { name: 'Theirs' }])
		.returning()
		.all();
	ours = forFamily(db, a.id);
	theirs = forFamily(db, b.id);
	mia = ours.addChild('Mia', 'pink').id;
	leo = ours.addChild('Leo', 'blue').id;
	sam = theirs.addChild('Sam', 'pink').id;
	const [user] = db
		.insert(schema.user)
		.values({ familyId: a.id, role: 'owner', email: 'a@example.test', googleSub: 'a', name: 'A' })
		.returning()
		.all();
	const expiresAt = new Date(NOW + 10 * OPEN_MS);
	db.insert(schema.session)
		.values([
			{ id: DEVICE, userId: user.id, expiresAt },
			{ id: OTHER_DEVICE, userId: user.id, expiresAt }
		])
		.run();
});

afterEach(() => opened.sqlite.close());

describe('checking a child', () => {
	it('accepts a plain name and colour, and refuses anything else', () => {
		expect(parseChild({ name: ' Ava ', colour: 'green' })).toEqual({
			ok: true,
			value: { name: 'Ava', colour: 'green' }
		});
		expect(parseChild({ name: '', colour: 'green' })).toMatchObject({ message: MESSAGES.noName });
		expect(parseChild({ name: '<b>Ava</b>', colour: 'green' })).toMatchObject({
			message: MESSAGES.badName
		});
		expect(parseChild({ name: 'Ava', colour: 'gold' })).toMatchObject({
			message: MESSAGES.sameColour
		});
		expect(parseChild({ name: 'Ava', colour: 'green', familyId: 2 }).ok).toBe(false);
		expect(parseChild('Ava').ok).toBe(false);
	});
});

describe('adding and changing children', () => {
	it('adds a child with their own name and colour', () => {
		const added = addChild(ours, { name: 'Ava', colour: 'green' });
		expect(added.ok).toBe(true);
		expect(ours.children().map((c) => c.name)).toEqual(['Mia', 'Leo', 'Ava']);
		expect(theirs.children().map((c) => c.name)).toEqual(['Sam']);
	});

	it('refuses a name or colour another child has, and a fifth child', () => {
		expect(addChild(ours, { name: 'MIA', colour: 'green' })).toMatchObject({
			message: MESSAGES.sameName
		});
		expect(addChild(ours, { name: 'Ava', colour: 'pink' })).toMatchObject({
			message: MESSAGES.sameColour
		});
		addChild(ours, { name: 'Ava', colour: 'green' });
		addChild(ours, { name: 'Zed', colour: 'purple' });
		expect(addChild(ours, { name: 'Max', colour: 'pink' })).toMatchObject({
			message: MESSAGES.tooManyChildren
		});
	});

	it('lets a child keep their own name and colour when saved', () => {
		expect(updateChild(ours, leo, { name: 'Leo', colour: 'blue' })).toMatchObject({ ok: true });
		expect(updateChild(ours, leo, { name: 'Theo', colour: 'green' })).toMatchObject({ ok: true });
		expect(ours.child(leo)).toMatchObject({ name: 'Theo', colour: 'green' });
		expect(updateChild(ours, leo, { name: 'Mia', colour: 'green' })).toMatchObject({
			message: MESSAGES.sameName
		});
	});

	it('never reaches another family’s child', () => {
		expect(childDetail(ours, sam)).toBeNull();
		expect(updateChild(ours, sam, { name: 'Hacked', colour: 'green' })).toBeNull();
		expect(removeChild(ours, sam)).toBeNull();
		expect(theirs.child(sam)?.name).toBe('Sam');
		expect(listChildren(ours).map((c) => c.id)).toEqual([mia, leo]);
	});
});

describe('removing a child', () => {
	it('removes their copies, stars and passcode, and keeps the chore', () => {
		const db = ours.db;
		const [chore] = db
			.insert(schema.chore)
			.values({ familyId: ours.familyId, name: 'Feed the dog', icon: 'paw', stars: 10 })
			.returning()
			.all();
		db.insert(schema.choreCopy)
			.values([
				{ familyId: ours.familyId, choreId: chore.id, childId: mia },
				{ familyId: ours.familyId, choreId: chore.id, childId: leo }
			])
			.run();
		addStars(ours, { childId: leo, kind: 'chore', amount: 10, sourceId: chore.id });
		addStars(ours, { childId: mia, kind: 'chore', amount: 5, sourceId: chore.id });
		setPasscode(ours, leo, RIGHT);
		tryPasscode(ours, DEVICE, leo, RIGHT, NOW);
		const before = familyVersion(ours);

		expect(removeChild(ours, leo)).toMatchObject({ ok: true });

		expect(ours.child(leo)).toBeNull();
		const left = (table: typeof schema.choreCopy | typeof schema.starEvent) =>
			db.select().from(table).where(eq(table.childId, leo)).all().length;
		expect(left(schema.choreCopy)).toBe(0);
		expect(left(schema.starEvent)).toBe(0);
		expect(db.select().from(schema.childPasscode).all()).toEqual([]);
		expect(db.select().from(schema.childUnlock).all()).toEqual([]);
		expect(db.select().from(schema.chore).all()).toHaveLength(1);
		expect(balance(ours, mia)).toBe(5);
		expect(familyVersion(ours)).toBeGreaterThan(before);
	});

	it('refuses to remove the last child', () => {
		expect(removeChild(ours, leo)).toMatchObject({ ok: true });
		expect(removeChild(ours, mia)).toMatchObject({ message: MESSAGES.lastChild });
		expect(childDetail(ours, mia)?.canRemove).toBe(false);
		expect(ours.child(mia)).not.toBeNull();
	});
});

describe('picture passcodes', () => {
	it('needs three known pictures, all different when set', () => {
		expect(parseNewPasscode({ pictures: RIGHT })).toEqual(RIGHT);
		expect(parseNewPasscode({ pictures: ['star', 'star', 'paw'] })).toBeNull();
		expect(parseNewPasscode({ pictures: ['star', 'paw'] })).toBeNull();
		expect(parseNewPasscode({ pictures: ['star', 'paw', 'dragon'] })).toBeNull();
		expect(parsePasscodeTry({ pictures: ['star', 'star', 'paw'] })).toHaveLength(3);
		expect(parsePasscodeTry({ pictures: RIGHT, extra: 1 })).toBeNull();
	});

	it('is off by default, and stores no readable pictures', () => {
		expect(hasPasscode(ours, mia)).toBe(false);
		expect(tripOpen(ours, DEVICE, mia, NOW)).toBe(true);
		setPasscode(ours, mia, RIGHT);
		const [row] = ours.db.select().from(schema.childPasscode).all();
		expect(row.hash).toMatch(/^scrypt\$/);
		expect(row.hash).not.toContain('rocket');
	});

	it('opens the trip only on this device, for the right pictures in order', () => {
		setPasscode(ours, mia, RIGHT);
		expect(tripOpen(ours, DEVICE, mia, NOW)).toBe(false);
		expect(tryPasscode(ours, DEVICE, mia, WRONG, NOW)).toEqual({ result: 'wrong' });
		expect(tripOpen(ours, DEVICE, mia, NOW)).toBe(false);
		expect(tryPasscode(ours, DEVICE, mia, RIGHT, NOW)).toEqual({ result: 'ok' });
		expect(tripOpen(ours, DEVICE, mia, NOW)).toBe(true);
		expect(tripOpen(ours, OTHER_DEVICE, mia, NOW)).toBe(false);
		expect(tripOpen(ours, DEVICE, leo, NOW)).toBe(true);
	});

	it('closes when Who’s flying is reached, or after an hour unused', () => {
		setPasscode(ours, mia, RIGHT);
		tryPasscode(ours, DEVICE, mia, RIGHT, NOW);
		tryPasscode(ours, OTHER_DEVICE, mia, RIGHT, NOW);
		closeTrips(ours, DEVICE);
		expect(tripOpen(ours, DEVICE, mia, NOW)).toBe(false);
		expect(tripOpen(ours, OTHER_DEVICE, mia, NOW + OPEN_MS - 1)).toBe(true);
		expect(tripOpen(ours, OTHER_DEVICE, mia, NOW + 2 * OPEN_MS - 2)).toBe(true);
		expect(tripOpen(ours, OTHER_DEVICE, mia, NOW + 4 * OPEN_MS)).toBe(false);
	});

	it('waits 30 seconds after 5 wrong tries, even for the right pictures', () => {
		setPasscode(ours, mia, RIGHT);
		const before = familyVersion(ours);
		for (let i = 0; i < 4; i++)
			expect(tryPasscode(ours, DEVICE, mia, WRONG, NOW)).toEqual({ result: 'wrong' });
		expect(tryPasscode(ours, DEVICE, mia, WRONG, NOW)).toEqual({ result: 'wait', seconds: 30 });
		expect(familyVersion(ours)).toBe(before);
		expect(waitSeconds(ours, mia, NOW + 1000)).toBe(29);
		expect(tryPasscode(ours, DEVICE, mia, RIGHT, NOW + 1000)).toEqual({
			result: 'wait',
			seconds: 29
		});
		expect(tripOpen(ours, DEVICE, mia, NOW + 1000)).toBe(false);
		expect(tryPasscode(ours, DEVICE, mia, RIGHT, NOW + WAIT_MS)).toEqual({ result: 'ok' });
	});

	it('closes open trips when changed or turned off', () => {
		setPasscode(ours, mia, RIGHT);
		tryPasscode(ours, DEVICE, mia, RIGHT, NOW);
		setPasscode(ours, mia, WRONG);
		expect(tripOpen(ours, DEVICE, mia, NOW)).toBe(false);
		expect(tryPasscode(ours, DEVICE, mia, RIGHT, NOW)).toEqual({ result: 'wrong' });
		expect(tryPasscode(ours, DEVICE, mia, WRONG, NOW)).toEqual({ result: 'ok' });
		removePasscode(ours, mia);
		expect(hasPasscode(ours, mia)).toBe(false);
		expect(ours.db.select().from(schema.childUnlock).all()).toEqual([]);
		expect(tripOpen(ours, DEVICE, mia, NOW)).toBe(true);
	});

	it('updates Who’s flying when turned on or off', () => {
		const start = familyVersion(ours);
		setPasscode(ours, mia, RIGHT);
		const on = familyVersion(ours);
		expect(on).toBeGreaterThan(start);
		removePasscode(ours, mia);
		expect(familyVersion(ours)).toBeGreaterThan(on);
	});

	it('never touches another family’s child', () => {
		setPasscode(theirs, sam, RIGHT);
		expect(setPasscode(ours, sam, WRONG)).toBe(false);
		expect(removePasscode(ours, sam)).toBe(false);
		expect(hasPasscode(ours, sam)).toBe(false);
		expect(passcodeChildIds(ours).size).toBe(0);
		expect(tryPasscode(theirs, DEVICE, sam, RIGHT, NOW)).toEqual({ result: 'ok' });
		closeTrips(ours, DEVICE);
		expect(hasPasscode(theirs, sam)).toBe(true);
		expect(tripOpen(theirs, DEVICE, sam, NOW)).toBe(true);
	});
});
