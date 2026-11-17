import { redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { childCards } from '#lib/server/flying.ts';
import { familyVersion } from '#lib/server/live.ts';
import { setupStep } from '#lib/server/setup.ts';
import type { PageServerLoad } from './$types';

// Who's flying: every device starts here after sign-in, once setup is done.
export const load: PageServerLoad = async ({ locals }) => {
	const scope = forFamily(getDb(), locals.user!.familyId);
	const version = familyVersion(scope);
	const step = setupStep(scope);
	if (step !== 'done') redirect(303, `/setup/${step}`);
	return { children: childCards(scope), version };
};
