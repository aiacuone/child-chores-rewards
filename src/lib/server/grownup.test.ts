import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { saveChildren, setFirstPin } from './setup';
import { AUTO_LOCK } from '../grownup-times';
import {
	FAILS_BEFORE_LOCK,
	LOCK_STEPS,
	endToken,
	padLockedUntil,
	unlock,
	useToken,
	type UnlockResult
} from './grownup';

let opened: ReturnType<typeof openDatabase>;
let ours: FamilyScope;
let theirs: FamilyScope;
const PIN = '4826';
const WRONG = '1111';

function addSession(scope: FamilyScope, id: string) {
	const [u] = opened.db
		.insert(schema.user)
		.values({
			familyId: scope.familyId,
			role: 'owner',
			email: `${id}@example.test`,
			googleSub: id,
			name: id
		})
		.returning()
		.all();
	opened.db
		.insert(schema.session)
		.values({ id, userId: u.id, expiresAt: new Date(Date.now() + 1e9) })
		.run();
	return id;
}

beforeEach(() => {
	opened = openDatabase(':memory:');
	const [a, b] = opened.db
		.insert(schema.family)
		.values([{ name: 'Ours' }, { name: 'Theirs' }])
		.returning()
		.all();
	ours = forFamily(opened.db, a.id);
	theirs = forFamily(opened.db, b.id);
	for (const scope of [ours, theirs]) {
		saveChildren(scope, [{ name: 'Mia', colour: 'pink' }]);
		setFirstPin(scope, PIN);
	}
	addSession(ours, 'phone');
	addSession(ours, 'tablet');
	addSession(theirs, 'other');
});
afterEach(() => opened.sqlite.close());

const token = (r: UnlockResult) => {
	if (!r.ok) throw new Error('expected ok');
	return r.token;
};

describe('PIN pad', () => {
	it('the right PIN starts grown-up mode', () => {
		const r = unlock(ours, 'phone', PIN);
		expect(r.ok).toBe(true);
		expect(useToken(ours, 'phone', token(r))).toBe(true);
	});

	it(`locks after ${FAILS_BEFORE_LOCK} wrong PINs, then for longer after each wrong PIN`, () => {
		let now = 1_000_000;
		for (let i = 1; i < FAILS_BEFORE_LOCK; i++)
			expect(unlock(ours, 'phone', WRONG, now)).toEqual({ ok: false, reason: 'wrong' });
		expect(unlock(ours, 'phone', WRONG, now)).toEqual({
			ok: false,
			reason: 'locked',
			until: now + 30_000,
			firstLock: true
		});

		for (const step of LOCK_STEPS.slice(1).concat(LOCK_STEPS.at(-1)!)) {
			now = padLockedUntil(ours, now)!;
			expect(unlock(ours, 'phone', WRONG, now)).toEqual({
				ok: false,
				reason: 'locked',
				until: now + step,
				firstLock: false
			});
		}
	});

	it('refuses even the right PIN while locked, without checking it', () => {
		const now = 1_000_000;
		for (let i = 0; i < FAILS_BEFORE_LOCK; i++) unlock(ours, 'phone', WRONG, now);
		expect(unlock(ours, 'tablet', PIN, now + 29_999)).toMatchObject({
			ok: false,
			reason: 'locked'
		});
		expect(unlock(ours, 'tablet', PIN, now + 30_000).ok).toBe(true);
	});

	it('counts wrong PINs per family, across devices', () => {
		const now = 1_000_000;
		for (let i = 0; i < FAILS_BEFORE_LOCK - 1; i++) unlock(ours, 'phone', WRONG, now);
		expect(unlock(ours, 'tablet', WRONG, now)).toMatchObject({ reason: 'locked' });
		expect(padLockedUntil(ours, now)).toBe(now + 30_000);
		expect(padLockedUntil(theirs, now)).toBeNull();
		expect(unlock(theirs, 'other', PIN, now).ok).toBe(true);
	});

	it('the right PIN resets the count', () => {
		const now = 1_000_000;
		for (let i = 0; i < FAILS_BEFORE_LOCK - 1; i++) unlock(ours, 'phone', WRONG, now);
		unlock(ours, 'phone', PIN, now);
		for (let i = 0; i < FAILS_BEFORE_LOCK - 1; i++)
			expect(unlock(ours, 'phone', WRONG, now)).toEqual({ ok: false, reason: 'wrong' });
	});

	it('the first lock of a new run alerts again after the right PIN', () => {
		let now = 1_000_000;
		for (let i = 0; i < FAILS_BEFORE_LOCK; i++) unlock(ours, 'phone', WRONG, now);
		now += 30_000;
		unlock(ours, 'phone', PIN, now);
		let last: UnlockResult = { ok: false, reason: 'wrong' };
		for (let i = 0; i < FAILS_BEFORE_LOCK; i++) last = unlock(ours, 'phone', WRONG, now);
		expect(last).toMatchObject({ reason: 'locked', firstLock: true });
	});
});

describe('grown-up tokens', () => {
	it('stay open while used, and stop after AUTO_LOCK plus a little grace', () => {
		const now = 1_000_000;
		const t = token(unlock(ours, 'phone', PIN, now));
		expect(useToken(ours, 'phone', t, now + AUTO_LOCK)).toBe(true);
		expect(useToken(ours, 'phone', t, now + AUTO_LOCK * 2)).toBe(true);
		expect(useToken(ours, 'phone', t, now + AUTO_LOCK * 4)).toBe(false);
	});

	it('work only on the device and in the family that unlocked', () => {
		const t = token(unlock(ours, 'phone', PIN));
		expect(useToken(ours, 'tablet', t)).toBe(false);
		expect(useToken(theirs, 'phone', t)).toBe(false);
		expect(useToken(theirs, 'other', t)).toBe(false);
		expect(useToken(ours, 'phone', t)).toBe(true);
	});

	it('stop when locked', () => {
		const t = token(unlock(ours, 'phone', PIN));
		endToken(theirs, t);
		expect(useToken(ours, 'phone', t)).toBe(true);
		endToken(ours, t);
		expect(useToken(ours, 'phone', t)).toBe(false);
	});

	it('refuse made-up tokens and keep only a hash', () => {
		const t = token(unlock(ours, 'phone', PIN));
		for (const bad of [null, '', 'x', 'a'.repeat(43), 42])
			expect(useToken(ours, 'phone', bad)).toBe(false);
		expect(JSON.stringify(opened.db.select().from(schema.grownupToken).all())).not.toContain(t);
	});

	it('stop when the device signs out', () => {
		const t = token(unlock(ours, 'phone', PIN));
		opened.sqlite.prepare("delete from session where id = 'phone'").run();
		expect(useToken(ours, 'phone', t)).toBe(false);
	});
});
