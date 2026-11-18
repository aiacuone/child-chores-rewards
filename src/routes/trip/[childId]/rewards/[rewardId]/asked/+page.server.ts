import { redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { waitingClaim } from '#lib/server/claims.ts';
import { getReward } from '#lib/server/rewards.ts';
import type { PageServerLoad } from './$types';

// "Asked a grown-up!" (Claim-Waiting.dc.html): only while this child's claim
// for the reward is waiting. Once a grown-up answers (the page refreshes by
// itself), or for any other reward, it goes back to My rewards.
export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { child } = await parent();
	const scope = forFamily(getDb(), locals.user!.familyId);
	const id = /^\d{1,9}$/.test(params.rewardId) ? Number(params.rewardId) : NaN;
	const claim = waitingClaim(scope, child.id, id);
	if (!claim) redirect(303, `/trip/${child.id}/rewards`);
	const reward = getReward(scope, id);
	return {
		rewardName: claim.rewardName,
		rewardColour: reward?.colour ?? 'pink',
		rewardPhoto: reward?.photo ?? null
	};
};
