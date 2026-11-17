import { redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { OPEN_PAGES, setupStep } from '#lib/server/setup.ts';
import type { LayoutServerLoad } from './$types';

// Each setup page opens only on the steps listed in OPEN_PAGES
// (src/lib/server/setup.ts); anything else goes to the family's current step.
// The actions check again, because a form post skips this load.
export const load: LayoutServerLoad = async ({ locals, route }) => {
	if (!locals.user) redirect(303, '/login');
	const step = setupStep(forFamily(getDb(), locals.user.familyId));
	const page = route.id?.split('/')[2];

	if (page === 'done') {
		if (step !== 'done') redirect(303, `/setup/${step}`);
	} else if (step === 'done') {
		redirect(303, '/');
	} else if (!(OPEN_PAGES[step] as string[]).includes(page ?? '')) {
		redirect(303, `/setup/${step}`);
	}
	return { step };
};
