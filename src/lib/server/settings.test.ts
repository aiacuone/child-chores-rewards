import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createSession, signOutOtherDevices, validateSession } from './auth';
import { settleBonus, bonusToday } from './bonus';
import { accept } from './check';
import { addChore } from './chores';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { parsePinChange, parseSettings } from './forms/settings';
import { changePin, unlock, useToken } from './grownup';
import { familyVersion } from './live';
import { hashPin, verifyPin } from './pin';
import { resetFamily } from './reset';
import { familyDay, getSettings, updateSettings } from './settings';
import { iDidIt, tripStops } from './trip';
import { DEFAULT_SETTINGS, returnLabel, timeLabel } from '../settings';

let opened: ReturnType<typeof openDatabase>;
let ours: FamilyScope;
let theirs: FamilyScope;
let mia: number;

beforeEach(() => {
	opened = openDatabase(':memory:');
	const [a, b] = opened.db
		.insert(schema.family)
		.values([
			{ name: 'Ours', pinHash: hashPin('1234') },
			{ name: 'Theirs', pinHash: hashPin('1234') }
		])
		.returning()
		.all();
	ours = forFamily(opened.db, a.id);
	theirs = forFamily(opened.db, b.id);
	mia = ours.addChild('Mia', 'pink').id;
});
afterEach(() => opened.sqlite.close());

// 5:00 am Wednesday 18 Nov 2026, Melbourne.
const fiveAm = new Date('2026-11-17T18:00:00Z');

function session(scope: FamilyScope, name: string) {
	const [user] = opened.db
		.insert(schema.user)
		.values({
			familyId: scope.familyId,
			role: 'owner',
			email: `${name}@example.test`,
			googleSub: name,
			name
		})
		.returning()
		.all();
	const token = createSession(opened.db, user.id).token;
	return { token, id: validateSession(opened.db, token)!.sessionId };
}

describe('settings', () => {
	it('start at the defaults and belong to one family', () => {
		expect(getSettings(ours)).toEqual(DEFAULT_SETTINGS);
		updateSettings(ours, { dailyBonus: 35, alertChores: false });
		expect(getSettings(ours)).toMatchObject({ dailyBonus: 35, alertChores: false });
		expect(getSettings(theirs)).toEqual(DEFAULT_SETTINGS);
	});

	it('tell children’s screens to reload', () => {
		const before = familyVersion(ours);
		updateSettings(ours, { autoReturnSeconds: 30 });
		expect(familyVersion(ours)).toBe(before + 1);
		expect(familyVersion(theirs)).toBe(0);
	});

	it('move the chore day with the reset time', () => {
		expect(familyDay(ours, fiveAm)).toBe('2026-11-17');
		updateSettings(ours, { resetMinutes: 4 * 60 + 30 });
		expect(familyDay(ours, fiveAm)).toBe('2026-11-18');
		expect(familyDay(theirs, fiveAm)).toBe('2026-11-17');
	});

	it('run the daily reset at the family’s own time', () => {
		const id = addChore(
			ours,
			{
				name: 'Tidy',
				expectations: '',
				icon: 'toys',
				stars: 10,
				childIds: [mia],
				repeat: { kind: 'daily' }
			},
			new Date('2026-11-16T23:00:00Z')
		);
		const tue = new Date('2026-11-16T23:00:00Z');
		accept(ours, iDidIt(ours, mia, id, tue)!.copyId, tue);
		expect(resetFamily(ours, tue)).toBe(1);
		accept(ours, iDidIt(ours, mia, id, tue)!.copyId, tue);
		expect(resetFamily(ours, fiveAm)).toBeNull();
		updateSettings(ours, { resetMinutes: 4 * 60 });
		expect(resetFamily(ours, fiveAm)).toBe(1);
		expect(tripStops(ours, mia, fiveAm).map((s) => s.state)).toEqual(['next']);
	});

	it('set the size of a new daily bonus', () => {
		const now = new Date('2026-11-16T23:00:00Z');
		updateSettings(ours, { dailyBonus: 35 });
		const id = addChore(
			ours,
			{
				name: 'Tidy',
				expectations: '',
				icon: 'toys',
				stars: 10,
				childIds: [mia],
				repeat: { kind: 'daily' }
			},
			now
		);
		accept(ours, iDidIt(ours, mia, id, now)!.copyId, now);
		settleBonus(ours, mia, now);
		expect(bonusToday(ours, mia, now)).toEqual({ stars: 35 });
	});

	it('set how long a grown-up token lasts', () => {
		const { id } = session(ours, 'phone');
		const now = 1_800_000_000_000;
		updateSettings(ours, { autoLockMinutes: 5 });
		const r = unlock(ours, id, '1234', now);
		if (!r.ok) throw new Error('no token');
		expect(useToken(ours, id, r.token, now + 5 * 60_000)).toBe(true);
		updateSettings(ours, { autoLockMinutes: 1 });
		expect(useToken(ours, id, r.token, now + 11 * 60_000)).toBe(false);
	});

	it('refuse anything outside the allowed choices', () => {
		expect(parseSettings({ autoLockMinutes: 5, alertRewards: false })).toEqual({
			autoLockMinutes: 5,
			alertRewards: false
		});
		for (const bad of [
			null,
			{},
			{ autoLockMinutes: 3 },
			{ autoReturnSeconds: 45 },
			{ resetMinutes: 15 },
			{ resetMinutes: 1440 },
			{ resetMinutes: -30 },
			{ dailyBonus: 3 },
			{ dailyBonus: 105 },
			{ dailyBonus: 12 },
			{ alertChores: 'no' },
			{ familyId: 2 },
			{ dailyBonus: 20, pinHash: 'x' }
		])
			expect(parseSettings(bad)).toBeNull();
	});

	it('read as the screens word them', () => {
		expect(timeLabel(360)).toBe('6:00 am');
		expect(timeLabel(0)).toBe('12:00 am');
		expect(timeLabel(750)).toBe('12:30 pm');
		expect(timeLabel(1410)).toBe('11:30 pm');
		expect([30, 60, 120].map(returnLabel)).toEqual(['30 seconds', '1 minute', '2 minutes']);
	});
});

describe('changing the PIN', () => {
	it('checks the form', () => {
		expect(parsePinChange({ current: '1234', pin: '5678', again: '5678' })).toMatchObject({
			ok: true
		});
		expect(parsePinChange({ current: '1234', pin: '5678', again: '5679' }).ok).toBe(false);
		expect(parsePinChange({ current: '12', pin: '5678', again: '5678' }).ok).toBe(false);
		expect(parsePinChange({ current: '1234', pin: 'abcd', again: 'abcd' }).ok).toBe(false);
		expect(parsePinChange(null).ok).toBe(false);
	});

	it('keeps this device open and locks the family’s others', () => {
		const phone = session(ours, 'phone');
		const tablet = session(ours, 'tablet');
		const other = session(theirs, 'other');
		const now = Date.now();
		const [a, b, c] = [
			unlock(ours, phone.id, '1234', now),
			unlock(ours, tablet.id, '1234', now),
			unlock(theirs, other.id, '1234', now)
		];
		if (!a.ok || !b.ok || !c.ok) throw new Error('no token');
		changePin(ours, a.token, '5678');
		expect(useToken(ours, phone.id, a.token, now)).toBe(true);
		expect(useToken(ours, tablet.id, b.token, now)).toBe(false);
		expect(useToken(theirs, other.id, c.token, now)).toBe(true);
		const pinOf = (s: FamilyScope) =>
			opened.db.select().from(schema.family).where(eq(schema.family.id, s.familyId)).all()[0]
				.pinHash!;
		expect(verifyPin('5678', pinOf(ours))).toBe(true);
		expect(verifyPin('1234', pinOf(theirs))).toBe(true);
	});
});

describe('signing out other devices', () => {
	it('ends every other session in the family, and no other family’s', () => {
		const phone = session(ours, 'phone');
		const tablet = session(ours, 'tablet');
		const other = session(theirs, 'other');
		expect(signOutOtherDevices(opened.db, ours.familyId, phone.id)).toBe(1);
		expect(validateSession(opened.db, phone.token)).not.toBeNull();
		expect(validateSession(opened.db, tablet.token)).toBeNull();
		expect(validateSession(opened.db, other.token)).not.toBeNull();
	});
});
