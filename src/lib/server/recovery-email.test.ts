import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import {
	LINK_LIFETIME,
	SENDS_PER_HOUR,
	TooManyEmails,
	confirmLink,
	dropLink,
	linkEmail,
	linkSent,
	startVerification
} from './recovery-email';

let opened: ReturnType<typeof openDatabase>;
let ours: FamilyScope;
let theirs: FamilyScope;

beforeEach(() => {
	opened = openDatabase(':memory:');
	const { db } = opened;
	const [a, b] = db
		.insert(schema.family)
		.values([{ name: 'Ours' }, { name: 'Theirs' }])
		.returning()
		.all();
	ours = forFamily(db, a.id);
	theirs = forFamily(db, b.id);
});
afterEach(() => opened.sqlite.close());

const recoveryOf = (scope: FamilyScope) =>
	opened.db.select().from(schema.family).where(eq(schema.family.id, scope.familyId)).all()[0]
		.recoveryEmail;

describe('recovery email confirm links', () => {
	it('uses the address only after the link is confirmed', () => {
		const { token } = startVerification(ours, 'jane@example.com');
		expect(recoveryOf(ours)).toBeNull();
		expect(linkEmail(opened.db, token)).toBe('jane@example.com');
		expect(recoveryOf(ours)).toBeNull();
		expect(confirmLink(opened.db, token)).toBe(true);
		expect(recoveryOf(ours)).toBe('jane@example.com');
	});

	it('stores only a hash of the token', () => {
		const { token } = startVerification(ours, 'jane@example.com');
		const rows = opened.db.select().from(schema.emailVerification).all();
		expect(JSON.stringify(rows)).not.toContain(token);
	});

	it('works once', () => {
		const { token } = startVerification(ours, 'jane@example.com');
		expect(confirmLink(opened.db, token)).toBe(true);
		expect(linkEmail(opened.db, token)).toBeNull();
		expect(confirmLink(opened.db, token)).toBe(false);
	});

	it('stops working after 24 hours', () => {
		const now = Date.now();
		const { token } = startVerification(ours, 'jane@example.com', now);
		expect(linkEmail(opened.db, token, now + LINK_LIFETIME - 1)).toBe('jane@example.com');
		expect(confirmLink(opened.db, token, now + LINK_LIFETIME)).toBe(false);
		expect(recoveryOf(ours)).toBeNull();
	});

	it('a newer link cancels the older one', () => {
		const first = startVerification(ours, 'old@example.com');
		const second = startVerification(ours, 'new@example.com');
		expect(confirmLink(opened.db, first.token)).toBe(false);
		expect(confirmLink(opened.db, second.token)).toBe(true);
		expect(recoveryOf(ours)).toBe('new@example.com');
	});

	it('refuses unknown or badly shaped tokens', () => {
		startVerification(ours, 'jane@example.com');
		for (const t of [null, '', 'x', 'a'.repeat(43), '../../etc', 42])
			expect(confirmLink(opened.db, t)).toBe(false);
		expect(recoveryOf(ours)).toBeNull();
	});

	it("confirms only the link's own family", () => {
		const { token } = startVerification(theirs, 'sam@example.com');
		startVerification(ours, 'jane@example.com');
		confirmLink(opened.db, token);
		expect(recoveryOf(theirs)).toBe('sam@example.com');
		expect(recoveryOf(ours)).toBeNull();
	});

	it(`allows ${SENDS_PER_HOUR} links an hour per family`, () => {
		const now = Date.now();
		for (let i = 0; i < SENDS_PER_HOUR; i++) startVerification(ours, 'jane@example.com', now + i);
		expect(() => startVerification(ours, 'jane@example.com', now + 10)).toThrow(TooManyEmails);
		expect(() => startVerification(theirs, 'sam@example.com', now + 10)).not.toThrow();
		expect(() =>
			startVerification(ours, 'jane@example.com', now + 60 * 60 * 1000 + 10)
		).not.toThrow();
	});

	it('a link whose email failed is dropped and does not count as sent', () => {
		const { token, id } = startVerification(ours, 'jane@example.com');
		dropLink(ours, id);
		expect(linkSent(ours)).toBe(false);
		expect(confirmLink(opened.db, token)).toBe(false);
	});

	it("cannot drop another family's link", () => {
		const { token, id } = startVerification(theirs, 'sam@example.com');
		dropLink(ours, id);
		expect(linkSent(theirs)).toBe(true);
		expect(linkEmail(opened.db, token)).toBe('sam@example.com');
	});
});
