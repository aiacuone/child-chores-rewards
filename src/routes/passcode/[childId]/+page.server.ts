// "Tap your 3 secret pictures" (Passcode-Enter). The pictures lead to the trip, or
// to the rocket photo with ?to=rocket. With no passcode the child goes straight
// there; another family's child is "not found".
import { error, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { childCard } from '#lib/server/flying.ts';
import { childIdFrom, hasPasscode, waitSeconds } from '#lib/server/passcode.ts';
import { setupStep } from '#lib/server/setup.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params, url }) => {
	const scope = forFamily(getDb(), locals.user!.familyId);
	if (setupStep(scope) !== 'done') redirect(303, '/');
	const id = childIdFrom(params.childId);
	const child = id ? childCard(scope, id) : null;
	if (!id || !child) error(404, 'Not found');
	const next = url.searchParams.get('to') === 'rocket' ? `/rocket/${id}` : `/trip/${id}`;
	if (!hasPasscode(scope, id)) redirect(303, next);
	return { child, next, waitSeconds: waitSeconds(scope, id) };
};
