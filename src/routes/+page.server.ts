import { redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { setupStep } from '#lib/server/setup.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		const step = setupStep(forFamily(getDb(), locals.user.familyId));
		if (step !== 'done') redirect(303, `/setup/${step}`);
	}
	return { name: locals.user?.name ?? '' };
};
