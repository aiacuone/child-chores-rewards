import { redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { ALERTS, familyTopic, sendAlert } from '#lib/server/alerts.ts';
import { claimNotice, claimReward, clearClaimNotices } from '#lib/server/claims.ts';
import { childRewards } from '#lib/server/rewards.ts';
import type { Actions, PageServerLoad } from './$types';
import { getSettings } from '#lib/server/settings.ts';

const wholeNumber = (raw: FormDataEntryValue | string | null) =>
	typeof raw === 'string' && /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;

// My rewards: the rewards that are for this child, each with a meter of their
// stars, and what a grown-up last answered. Only the signed-in family's child
// and rewards are reached (the trip layout has already refused any other child).
export const load: PageServerLoad = async ({ locals, parent }) => {
	const { child } = await parent();
	const scope = forFamily(getDb(), locals.user!.familyId);
	return { rewards: childRewards(scope, child.id), notice: claimNotice(scope, child.id) };
};

export const actions: Actions = {
	// "Claim": ask a grown-up for the reward. A second tap changes nothing and
	// sends no second alert. Stars are not taken until a grown-up hands it out.
	claim: async ({ locals, params, request, url }) => {
		const scope = forFamily(getDb(), locals.user!.familyId);
		const child = scope.child(wholeNumber(params.childId));
		if (!child) redirect(303, '/');
		const rewardId = wholeNumber((await request.formData()).get('reward'));
		const claim = claimReward(scope, child.id, rewardId);
		if (!claim) redirect(303, `/trip/${child.id}/rewards`);
		const topic = familyTopic(scope);
		// A tap on the alert opens the PIN pad, then this claim's hand-out screen.
		if (claim.isNew && topic && getSettings(scope).alertRewards) {
			sendAlert(topic, {
				...ALERTS.rewardClaimed,
				click: `${url.origin}/grown-up/claim/${claim.id}`
			}).catch(() => {});
		}
		redirect(303, `/trip/${child.id}/rewards/${rewardId}/asked`);
	},

	// The answer has been shown, so it does not show again. No redirect: the
	// page stays as it is.
	seen: async ({ locals, params, request }) => {
		const scope = forFamily(getDb(), locals.user!.familyId);
		const child = scope.child(wholeNumber(params.childId));
		const upTo = wholeNumber((await request.formData()).get('upTo'));
		if (child && !Number.isNaN(upTo)) clearClaimNotices(scope, child.id, upTo);
		return { seen: true };
	}
};
