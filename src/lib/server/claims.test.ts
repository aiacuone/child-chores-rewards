import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { addReward, childRewards, listRewards, removeReward, updateReward } from './rewards';
import {
	claimDetails,
	claimNotice,
	claimReward,
	clearClaimNotices,
	decline,
	handOut,
	waitingClaim,
	waitingClaims
} from './claims';
import { parseClaimAnswer } from './forms/claims';
import { addStars, balance, history } from './stars';
import { familyVersion } from './live';

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

const reward = (name: string, cost: number, childIds: number[], scope = ours) =>
	addReward(scope, { name, cost, colour: 'blue', childIds });
const stars = (childId: number, amount: number, scope = ours) =>
	addStars(scope, { childId, kind: 'chore', amount });

describe('claiming', () => {
	it('is allowed only for a reward that is for the child and that they can afford', () => {
		stars(mia, 100);
		const screen = reward('Extra screen time', 100, [mia]);
		const movie = reward('Movie night', 150, [mia]);
		const leos = reward('Leo’s lego', 10, [leo]);
		expect(claimReward(ours, mia, screen)).toMatchObject({ isNew: true });
		expect(claimReward(ours, mia, movie)).toBeNull();
		expect(claimReward(ours, mia, leos)).toBeNull();
		expect(claimReward(ours, mia, 9999)).toBeNull();
		expect(claimReward(ours, mia, Number.NaN)).toBeNull();
	});

	it('does not take any stars, and a second tap changes nothing', () => {
		stars(mia, 128);
		const screen = reward('Extra screen time', 100, [mia]);
		const first = claimReward(ours, mia, screen)!;
		const again = claimReward(ours, mia, screen)!;
		expect(again).toEqual({ id: first.id, isNew: false });
		expect(balance(ours, mia)).toBe(128);
		expect(waitingClaims(ours)).toHaveLength(1);
		expect(waitingClaim(ours, mia, screen)).toEqual({
			id: first.id,
			rewardName: 'Extra screen time'
		});
		expect(childRewards(ours, mia)[0].asked).toBe(true);
		expect(listRewards(ours)[0].waiting).toEqual({ claimId: first.id });
	});
});

describe('handing out', () => {
	it('takes the reward’s cost once, as one reward row, and closes the claim', () => {
		stars(mia, 128);
		const screen = reward('Extra screen time', 100, [mia]);
		const { id } = claimReward(ours, mia, screen)!;
		expect(claimDetails(ours, id)).toMatchObject({ status: 'waiting', stars: 128 });
		expect(handOut(ours, id)).toBe('ok');
		expect(handOut(ours, id)).toBe('gone');
		expect(balance(ours, mia)).toBe(28);
		expect(history(ours, mia).filter((r) => r.kind === 'reward')).toMatchObject([
			{ amount: -100, sourceId: id }
		]);
		expect(claimDetails(ours, id)).toMatchObject({ status: 'handed_out', stars: 28 });
		expect(waitingClaims(ours)).toEqual([]);
	});

	it('uses the cost at the moment it is handed out', () => {
		stars(mia, 128);
		const screen = reward('Extra screen time', 100, [mia]);
		const { id } = claimReward(ours, mia, screen)!;
		updateReward(ours, screen, {
			name: 'Extra screen time',
			cost: 60,
			colour: 'blue',
			childIds: [mia]
		});
		handOut(ours, id);
		expect(balance(ours, mia)).toBe(68);
	});

	it('is refused when the stars have dropped below the cost, so they never go below 0', () => {
		const grant = stars(mia, 100);
		const screen = reward('Extra screen time', 100, [mia]);
		const { id } = claimReward(ours, mia, screen)!;
		opened.sqlite.prepare('delete from star_event where id = ?').run(grant.id);
		expect(handOut(ours, id)).toBe('short');
		expect(balance(ours, mia)).toBe(0);
		expect(claimDetails(ours, id)?.status).toBe('waiting');
	});

	it('can be claimed again after it was handed out', () => {
		stars(mia, 250);
		const screen = reward('Extra screen time', 100, [mia]);
		handOut(ours, claimReward(ours, mia, screen)!.id);
		expect(claimReward(ours, mia, screen)).toMatchObject({ isNew: true });
	});

	it('goes with its reward when the reward is removed', () => {
		stars(mia, 100);
		const screen = reward('Extra screen time', 100, [mia]);
		const { id } = claimReward(ours, mia, screen)!;
		removeReward(ours, screen);
		expect(claimDetails(ours, id)).toBeNull();
		expect(handOut(ours, id)).toBe('gone');
	});
});

describe('declining', () => {
	it('keeps the stars, shows the message once, and lets the child ask again', () => {
		stars(mia, 128);
		const screen = reward('Extra screen time', 100, [mia]);
		const { id } = claimReward(ours, mia, screen)!;
		expect(decline(ours, id, 'Maybe on the weekend!')).toBe(true);
		expect(decline(ours, id, 'Again')).toBe(false);
		expect(handOut(ours, id)).toBe('gone');
		expect(balance(ours, mia)).toBe(128);
		const notice = claimNotice(ours, mia)!;
		expect(notice).toMatchObject({
			kind: 'declined',
			rewardName: 'Extra screen time',
			message: 'Maybe on the weekend!'
		});
		expect(claimNotice(ours, mia)).toEqual(notice);
		clearClaimNotices(ours, mia, notice.id);
		expect(claimNotice(ours, mia)).toBeNull();
		expect(claimReward(ours, mia, screen)).toMatchObject({ isNew: true });
	});

	it('shows a handed-out reward once, with the stars taken', () => {
		stars(mia, 128);
		const screen = reward('Extra screen time', 100, [mia]);
		handOut(ours, claimReward(ours, mia, screen)!.id);
		expect(claimNotice(ours, mia)).toMatchObject({
			kind: 'handed_out',
			rewardName: 'Extra screen time',
			stars: 100
		});
		expect(claimNotice(ours, leo)).toBeNull();
	});
});

describe('checking an answer', () => {
	it('accepts good input and refuses bad input', () => {
		expect(parseClaimAnswer({ action: 'handOut' })).toEqual({ action: 'handOut' });
		expect(parseClaimAnswer({ action: 'decline', message: 'Maybe on the weekend!' })).toEqual({
			action: 'decline',
			message: 'Maybe on the weekend!'
		});
		for (const bad of [
			{ action: 'decline' },
			{ action: 'decline', message: '' },
			{ action: 'decline', message: ' padded' },
			{ action: 'decline', message: 'x'.repeat(101) },
			{ action: 'decline', message: 'bad\u0000message' },
			{ action: 'refund' },
			'handOut'
		])
			expect(parseClaimAnswer(bad)).toBeNull();
	});
});

describe('live updates', () => {
	it('bumps only the changed family’s version', () => {
		stars(mia, 100);
		const screen = reward('Extra screen time', 100, [mia]);
		const before = [familyVersion(ours), familyVersion(theirs)];
		const { id } = claimReward(ours, mia, screen)!;
		const afterClaim = familyVersion(ours);
		expect(afterClaim).toBeGreaterThan(before[0]);
		decline(ours, id, 'Ask me again tomorrow');
		expect(familyVersion(ours)).toBeGreaterThan(afterClaim);
		expect(familyVersion(theirs)).toBe(before[1]);
	});
});

describe("one family cannot claim, see or answer another's rewards", () => {
	it('never lists, reads or answers across families', () => {
		stars(sam, 100, theirs);
		const theirReward = reward('Their pizza', 100, [sam], theirs);
		const theirClaim = claimReward(theirs, sam, theirReward)!;
		stars(mia, 500);
		expect(claimReward(ours, mia, theirReward)).toBeNull();
		expect(claimReward(ours, sam, theirReward)).toBeNull();
		expect(waitingClaims(ours)).toEqual([]);
		expect(waitingClaim(ours, sam, theirReward)).toBeNull();
		expect(claimDetails(ours, theirClaim.id)).toBeNull();
		expect(handOut(ours, theirClaim.id)).toBe('gone');
		expect(decline(ours, theirClaim.id, 'No')).toBe(false);
		expect(claimNotice(ours, sam)).toBeNull();
		expect(balance(theirs, sam)).toBe(100);
		expect(waitingClaims(theirs)).toHaveLength(1);
		expect(handOut(theirs, theirClaim.id)).toBe('ok');
		expect(balance(ours, mia)).toBe(500);
	});
});
