import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { childRewards } from '#lib/server/rewards.ts';
import type { PageServerLoad } from './$types';

// My rewards: the rewards that are for this child, each with a meter of their
// stars. Only the signed-in family's child and rewards are reached (the trip
// layout has already refused any other child).
export const load: PageServerLoad = async ({ locals, parent }) => {
	const { child } = await parent();
	const scope = forFamily(getDb(), locals.user!.familyId);
	return { rewards: childRewards(scope, child.id) };
};
