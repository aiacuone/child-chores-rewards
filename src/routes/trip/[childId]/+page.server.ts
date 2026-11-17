import { error, redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { childCard } from '#lib/server/flying.ts';
import { setupStep } from '#lib/server/setup.ts';
import type { PageServerLoad } from './$types';

// A child's trip. Until #22 it is the trip header and "Nothing to do today!".
// A child from another family, or any id that is not a whole number, is "not found".
export const load: PageServerLoad = async ({ locals, params }) => {
	const scope = forFamily(getDb(), locals.user!.familyId);
	if (setupStep(scope) !== 'done') redirect(303, '/');
	const id = /^\d{1,9}$/.test(params.childId) ? Number(params.childId) : NaN;
	const child = childCard(scope, id);
	if (!child) error(404, 'Not found');
	return { child };
};
