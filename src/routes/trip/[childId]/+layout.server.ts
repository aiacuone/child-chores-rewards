import { error, redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { childCard } from '#lib/server/flying.ts';
import { familyVersion } from '#lib/server/live.ts';
import { setupStep } from '#lib/server/setup.ts';
import type { LayoutServerLoad } from './$types';

// Every page of a child's trip (the trip, a stop, Coming up) is for one child.
// A child from another family, or any id that is not a whole number, is "not found".
export const load: LayoutServerLoad = async ({ locals, params }) => {
	// Read first, so a change while the page loads is picked up by the next check.
	const version = familyVersion(forFamily(getDb(), locals.user!.familyId));
	const scope = forFamily(getDb(), locals.user!.familyId);
	if (setupStep(scope) !== 'done') redirect(303, '/');
	const id = /^\d{1,9}$/.test(params.childId) ? Number(params.childId) : NaN;
	const child = childCard(scope, id);
	if (!child) error(404, 'Not found');
	return { child, version };
};
