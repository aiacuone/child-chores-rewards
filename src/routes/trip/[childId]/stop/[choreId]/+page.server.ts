import { redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { openStop } from '#lib/server/trip.ts';
import type { PageServerLoad } from './$types';

// One stop on the trip. Only the child's own unfinished stops for today open;
// anything else (done, waiting, not due, another child's or another family's
// chore, or an id that is not a whole number) goes back to the trip.
export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { child } = await parent();
	const scope = forFamily(getDb(), locals.user!.familyId);
	const id = /^\d{1,9}$/.test(params.choreId) ? Number(params.choreId) : NaN;
	const stop = openStop(scope, child.id, id);
	if (!stop) redirect(303, `/trip/${child.id}`);
	return { stop };
};
