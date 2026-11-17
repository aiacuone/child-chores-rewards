import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { comingUp } from '#lib/server/trip.ts';
import type { PageServerLoad } from './$types';

// The child's chores due on the next 6 days instead of today.
export const load: PageServerLoad = async ({ locals, parent }) => {
	const { child } = await parent();
	return { chores: comingUp(forFamily(getDb(), locals.user!.familyId), child.id) };
};
