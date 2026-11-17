import { redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { setupStep } from '#lib/server/setup.ts';
import type { LayoutServerLoad } from './$types';

// Setup is open only until the PIN is set (src/lib/server/setup.ts).
export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	const step = setupStep(forFamily(getDb(), locals.user.familyId));
	if (step === 'done') redirect(303, '/');
	return { step };
};
