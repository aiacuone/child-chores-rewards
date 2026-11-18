import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { checkPin, FAILS_BEFORE_LOCK, padLockedUntil, unlock, useToken } from './grownup';
import { hashPin, verifyPin } from './pin';
import {
	CODE_LIFETIME,
	CODES_PER_HOUR,
	TooManyCodes,
	WRONG_TRIES,
	dropCode,
	resetState,
	resetTarget,
	startReset,
	useResetCode
} from './pin-reset';
import { confirmLink, recoveryEmail, startVerification } from './recovery-email';

let opened: ReturnType<typeof openDatabase>;
let ours: FamilyScope;
let theirs: FamilyScope;
const now = 1_800_000_000_000;
const OLD = '1234';
const NEW = '5678';

const family = (scope: FamilyScope) =>
	scope.db.select().from(schema.family).where(eq(schema.family.id, scope.familyId)).all()[0];
const wrongCode = (code: string) => (code === '000000' ? '000001' : '000000');

beforeEach(() => {
	opened = openDatabase(':memory:');
	const [a, b] = opened.db
		.insert(schema.family)
		.values([
			{ name: 'Ours', pinHash: hashPin(OLD), recoveryEmail: 'ours@example.test' },
			{ name: 'Theirs', pinHash: hashPin(OLD), recoveryEmail: 'theirs@example.test' }
		])
		.returning()
		.all();
	ours = forFamily(opened.db, a.id);
	theirs = forFamily(opened.db, b.id);
});
afterEach(() => opened.sqlite.close());

describe('a reset code', () => {
	it('is 6 digits, and only its hash is stored', () => {
		const { code } = startReset(ours, now);
		expect(code).toMatch(/^\d{6}$/);
		const [row] = opened.db.select().from(schema.pinReset).all();
		expect(row.codeHash).toMatch(/^scrypt\$/);
		expect(row.codeHash).not.toContain(code);
	});

	it('sets the new PIN, once, and clears the lock', () => {
		for (let i = 0; i < FAILS_BEFORE_LOCK; i++) unlock(ours, 'phone', '9999', now);
		expect(padLockedUntil(ours, now)).not.toBeNull();
		const { code } = startReset(ours, now);
		expect(useResetCode(ours, code, NEW, now)).toBe('ok');
		expect(verifyPin(NEW, family(ours).pinHash!)).toBe(true);
		expect(verifyPin(OLD, family(ours).pinHash!)).toBe(false);
		expect(padLockedUntil(ours, now)).toBeNull();
		expect(family(ours).pinFails).toBe(0);
		expect(resetState(ours, now)).toBe('none');
		expect(useResetCode(ours, code, '1111', now)).toBe('cancelled');
		expect(verifyPin(NEW, family(ours).pinHash!)).toBe(true);
	});

	it('ends every grown-up session of the family, and no other family’s', () => {
		for (const [scope, id] of [
			[ours, 'phone'],
			[theirs, 'other']
		] as const) {
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
				.values({ id, userId: u.id, expiresAt: new Date(now + 1e9) })
				.run();
		}
		const mine = unlock(ours, 'phone', OLD, now);
		const other = unlock(theirs, 'other', OLD, now);
		if (!mine.ok || !other.ok) throw new Error('no token');
		useResetCode(ours, startReset(ours, now).code, NEW, now);
		expect(useToken(ours, 'phone', mine.token, now)).toBe(false);
		expect(useToken(theirs, 'other', other.token, now)).toBe(true);
	});

	it('is cancelled by the fifth wrong try, even if the right code follows', () => {
		const { code } = startReset(ours, now);
		for (let i = 1; i < WRONG_TRIES; i++)
			expect(useResetCode(ours, wrongCode(code), NEW, now)).toBe('wrong');
		expect(resetState(ours, now)).toBe('open');
		expect(useResetCode(ours, wrongCode(code), NEW, now)).toBe('cancelled');
		expect(resetState(ours, now)).toBe('cancelled');
		expect(useResetCode(ours, code, NEW, now)).toBe('cancelled');
		expect(verifyPin(OLD, family(ours).pinHash!)).toBe(true);
	});

	it('still works after fewer than five wrong tries', () => {
		const { code } = startReset(ours, now);
		for (let i = 1; i < WRONG_TRIES; i++) useResetCode(ours, wrongCode(code), NEW, now);
		expect(useResetCode(ours, code, NEW, now)).toBe('ok');
	});

	it('expires', () => {
		const { code } = startReset(ours, now);
		expect(resetState(ours, now + CODE_LIFETIME - 1)).toBe('open');
		expect(resetState(ours, now + CODE_LIFETIME)).toBe('cancelled');
		expect(useResetCode(ours, code, NEW, now + CODE_LIFETIME)).toBe('cancelled');
	});

	it('is replaced by a newer code', () => {
		const first = startReset(ours, now);
		let second = startReset(ours, now + 1);
		while (second.code === first.code) second = startReset(ours, now + 2);
		expect(useResetCode(ours, first.code, NEW, now + 3)).toBe('wrong');
		expect(useResetCode(ours, second.code, NEW, now + 3)).toBe('ok');
	});

	it('can be sent 5 times an hour, and a failed send does not count', () => {
		const failed = startReset(ours, now);
		dropCode(ours, failed.id);
		for (let i = 0; i < CODES_PER_HOUR; i++) startReset(ours, now);
		expect(() => startReset(ours, now)).toThrow(TooManyCodes);
		expect(() => startReset(theirs, now)).not.toThrow();
		expect(() => startReset(ours, now + 3600_001)).not.toThrow();
	});

	it('from one family never changes another family’s PIN', () => {
		const { code, id } = startReset(ours, now);
		expect(resetState(theirs, now)).toBe('none');
		expect(useResetCode(theirs, code, NEW, now)).toBe('cancelled');
		dropCode(theirs, id);
		expect(resetState(ours, now)).toBe('open');
		expect(verifyPin(OLD, family(theirs).pinHash!)).toBe(true);
		expect(verifyPin(OLD, family(ours).pinHash!)).toBe(true);
	});

	it('goes only to the confirmed recovery email', () => {
		startVerification(ours, 'new@example.test', now);
		expect(resetTarget(ours).email).toBe('ours@example.test');
	});
});

describe('checking the PIN inside grown-up mode', () => {
	it('counts wrong tries towards the same lock as the pad', () => {
		expect(checkPin(ours, OLD, now)).toEqual({ ok: true });
		for (let i = 1; i < FAILS_BEFORE_LOCK; i++)
			expect(checkPin(ours, '9999', now)).toEqual({ ok: false, reason: 'wrong' });
		expect(checkPin(ours, '9999', now)).toMatchObject({ reason: 'locked', firstLock: true });
		expect(unlock(ours, 'phone', OLD, now)).toMatchObject({ reason: 'locked', firstLock: false });
		expect(checkPin(ours, OLD, now)).toMatchObject({ reason: 'locked' });
	});
});

describe('changing the recovery email', () => {
	it('keeps the old address until the link is confirmed, and says it changed', () => {
		const { token } = startVerification(ours, 'new@example.test', now);
		expect(recoveryEmail(ours)).toBe('ours@example.test');
		expect(confirmLink(opened.db, token, now)).toEqual({ familyId: ours.familyId, changed: true });
		expect(recoveryEmail(ours)).toBe('new@example.test');
		expect(recoveryEmail(theirs)).toBe('theirs@example.test');
	});

	it('does not count the first address, or the same one again, as a change', () => {
		opened.db
			.update(schema.family)
			.set({ recoveryEmail: null })
			.where(eq(schema.family.id, ours.familyId))
			.run();
		const first = startVerification(ours, 'a@example.test', now);
		expect(confirmLink(opened.db, first.token, now)).toMatchObject({ changed: false });
		const same = startVerification(ours, 'a@example.test', now + 1);
		expect(confirmLink(opened.db, same.token, now + 1)).toMatchObject({ changed: false });
	});
});
