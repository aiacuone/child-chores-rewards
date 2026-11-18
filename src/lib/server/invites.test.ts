import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createSession, signInGoogleUser, validateSession, type SignedInUser } from './auth';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import {
	INVITES_PER_HOUR,
	INVITE_DAYS,
	cancelInvite,
	familyGrownUps,
	grownUpsView,
	removeGrownUp,
	startInvite
} from './invites';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60_000;
const sam = { sub: 'sam-sub', email: 'sam@example.com', name: 'Sam' };

let opened: ReturnType<typeof openDatabase>;
let ours: FamilyScope;
let theirs: FamilyScope;
let owner: SignedInUser;
let otherOwner: SignedInUser;

const account = (id: number): SignedInUser => {
	const [u] = opened.db.select().from(schema.user).where(eq(schema.user.id, id)).all();
	return u;
};
const inviteId = (scope: FamilyScope, email: string, now = NOW) => {
	const started = startInvite(scope, email, now);
	if (typeof started === 'string') throw new Error(started);
	return started.id;
};
const signIn = (now = NOW) => signInGoogleUser(opened.db, sam, 'never', now);

beforeEach(() => {
	opened = openDatabase(':memory:');
	const db = opened.db;
	const a = signInGoogleUser(
		db,
		{ sub: 'owner', email: 'owner@example.com', name: 'Owner' },
		'first-only'
	)!;
	owner = account(a.id);
	const b = signInGoogleUser(
		db,
		{ sub: 'other', email: 'other@example.com', name: 'Other' },
		'always'
	)!;
	otherOwner = account(b.id);
	ours = forFamily(db, owner.familyId);
	theirs = forFamily(db, otherOwner.familyId);
});

afterEach(() => opened.sqlite.close());

describe('who gets in', () => {
	it('lets a listed account start only the first family', () => {
		expect(owner.role).toBe('owner');
		const late = { sub: 'late', email: 'late@example.com', name: 'Late' };
		expect(signInGoogleUser(opened.db, late, 'first-only')).toBeNull();
		expect(opened.db.select().from(schema.family).all()).toHaveLength(2);
	});

	it('refuses an uninvited account and still knows existing ones', () => {
		expect(signIn()).toBeNull();
		const again = signInGoogleUser(
			opened.db,
			{ sub: 'owner', email: 'owner@example.com', name: 'Owner' },
			'never'
		);
		expect(again).toEqual({ id: owner.id, created: false });
	});

	it('joins the inviting family as a grown-up, ignoring capitals', () => {
		inviteId(ours, 'SAM@Example.com', NOW);
		const joined = signIn()!;
		expect(account(joined.id)).toMatchObject({
			familyId: ours.familyId,
			role: 'grownup',
			email: 'sam@example.com'
		});
		expect(grownUpsView(ours, owner, NOW).invites).toEqual([]);
	});

	it('does not accept another account with the invited email', () => {
		signInGoogleUser(opened.db, { ...sam, sub: 'first' }, 'always');
		inviteIdFails();
		expect(signInGoogleUser(opened.db, { ...sam, sub: 'second' }, 'always')).toBeNull();
	});

	const inviteIdFails = () => expect(startInvite(ours, sam.email, NOW)).toBe('joined');

	it('stops working after 7 days, and can be sent again', () => {
		inviteId(ours, sam.email);
		const end = NOW + INVITE_DAYS * DAY;
		expect(grownUpsView(ours, owner, end - 1).invites[0].expired).toBe(false);
		expect(grownUpsView(ours, owner, end).invites[0].expired).toBe(true);
		expect(signIn(end)).toBeNull();
		inviteId(ours, sam.email, end);
		expect(grownUpsView(ours, owner, end).invites).toHaveLength(1);
		expect(signIn(end)).not.toBeNull();
	});

	it('does not work once cancelled', () => {
		const id = inviteId(ours, sam.email);
		expect(cancelInvite(ours, id, NOW)).toBe(true);
		expect(cancelInvite(ours, id, NOW)).toBe(false);
		expect(signIn()).toBeNull();
	});
});

describe('sending invites', () => {
	it('masks emails on the list', () => {
		inviteId(ours, sam.email);
		expect(grownUpsView(ours, owner, NOW)).toMatchObject({
			people: [{ name: 'Owner', email: 'o•••@example.com', you: true, owner: true }],
			invites: [{ name: 'sam', email: 's•••@example.com', expired: false }]
		});
	});

	it('limits sends per hour, counting cancelled ones', () => {
		for (let i = 0; i < INVITES_PER_HOUR; i++)
			cancelInvite(ours, inviteId(ours, `p${i}@example.com`), NOW);
		expect(startInvite(ours, sam.email, NOW)).toBe('tooMany');
		expect(startInvite(theirs, sam.email, NOW)).not.toBe('tooMany');
		expect(startInvite(ours, sam.email, NOW + 60 * 60_000 + 1)).not.toBe('tooMany');
	});
});

describe('removing a grown-up', () => {
	it('ends their sessions, and they need a new invite', () => {
		inviteId(ours, sam.email);
		const { id } = signIn()!;
		const { token } = createSession(opened.db, id, NOW);
		expect(validateSession(opened.db, token, NOW)).not.toBeNull();
		expect(removeGrownUp(ours, owner, id)).toBe('removed');
		expect(validateSession(opened.db, token, NOW)).toBeNull();
		expect(signIn()).toBeNull();
		inviteId(ours, sam.email, NOW + 1);
		expect(signIn(NOW + 2)).not.toBeNull();
	});

	it('is for the owner only, and never removes the owner', () => {
		inviteId(ours, sam.email);
		const member = account(signIn()!.id);
		expect(removeGrownUp(ours, member, owner.id)).toBe('forbidden');
		expect(removeGrownUp(ours, member, member.id)).toBe('forbidden');
		expect(removeGrownUp(ours, owner, owner.id)).toBe('forbidden');
		expect(familyGrownUps(ours)).toHaveLength(2);
		expect(grownUpsView(ours, member, NOW).people.every((p) => !p.canRemove)).toBe(true);
	});
});

describe('other families', () => {
	it('cannot see or change this family’s invites or grown-ups', () => {
		const id = inviteId(ours, sam.email);
		const member = signIn()!.id;
		const waiting = inviteId(ours, 'ann@example.com');
		expect(cancelInvite(theirs, id, NOW)).toBe(false);
		expect(cancelInvite(theirs, waiting, NOW)).toBe(false);
		expect(removeGrownUp(theirs, otherOwner, member)).toBe('missing');
		expect(removeGrownUp(theirs, owner, member)).toBe('forbidden');
		expect(grownUpsView(theirs, otherOwner, NOW)).toMatchObject({
			people: [{ name: 'Other' }],
			invites: []
		});
	});
});
