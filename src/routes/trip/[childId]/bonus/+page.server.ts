import { redirect } from '@sveltejs/kit';
import { bonusToday } from '#lib/server/bonus.ts';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { tripStops } from '#lib/server/trip.ts';
import type { PageServerLoad } from './$types';

// The bonus planet: "Finish the whole trip" until every stop is Done, then
// "Trip complete!". A day with no stops has no bonus planet, so it goes back.
export const load: PageServerLoad = async ({ locals, parent }) => {
	const { child } = await parent();
	const scope = forFamily(getDb(), locals.user!.familyId);
	const stops = tripStops(scope, child.id);
	if (!stops.length) redirect(303, `/trip/${child.id}`);
	return { states: stops.map((s) => s.state), bonus: bonusToday(scope, child.id) };
};
