// A child's rocket photo (My-Rocket). A passcode, when set, is checked in
// hooks.server.ts; another family's child is "not found".
import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { childCard } from '#lib/server/flying.ts';
import { rowId } from '#lib/server/row-id.ts';
import { setupStep } from '#lib/server/setup.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params }) => {
	const scope = forFamily(getDb(), locals.user!.familyId);
	if (setupStep(scope) !== 'done') redirect(303, '/');
	const id = rowId(params.childId);
	const child = id ? childCard(scope, id) : null;
	if (!child) error(404, 'Not found');
	return { child };
};
