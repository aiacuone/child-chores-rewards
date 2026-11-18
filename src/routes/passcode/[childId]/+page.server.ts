// "Tap your 3 secret pictures" (Passcode-Enter). A child with no passcode goes
// straight to the trip; another family's child is "not found".
import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { childCard } from '#lib/server/flying.ts';
import { childIdFrom, hasPasscode, waitSeconds } from '#lib/server/passcode.ts';
import { setupStep } from '#lib/server/setup.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params }) => {
	const scope = forFamily(getDb(), locals.user!.familyId);
	if (setupStep(scope) !== 'done') redirect(303, '/');
	const id = childIdFrom(params.childId);
	const child = id ? childCard(scope, id) : null;
	if (!id || !child) error(404, 'Not found');
	if (!hasPasscode(scope, id)) redirect(303, `/trip/${id}`);
	return { child, waitSeconds: waitSeconds(scope, id) };
};
