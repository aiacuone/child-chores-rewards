import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { comingUp, tripStops } from '#lib/server/trip.ts';
import type { PageServerLoad } from './$types';

// Today's stops, and how many chores are coming up on other days.
export const load: PageServerLoad = async ({ locals, parent }) => {
	const { child } = await parent();
	const scope = forFamily(getDb(), locals.user!.familyId);
	return { stops: tripStops(scope, child.id), comingUp: comingUp(scope, child.id).length };
};
