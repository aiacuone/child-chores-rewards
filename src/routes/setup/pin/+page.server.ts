import { fail, redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { parsePin } from '#lib/server/forms/setup.ts';
import { SetupClosed, setFirstPin } from '#lib/server/setup.ts';
import type { Actions, PageServerLoad } from './$types';

// Setup step 2 (Setup-PIN.dc.html). The PIN is hashed at once and is never
// logged or sent back to the page, even when the form is refused.
export const load: PageServerLoad = async ({ parent }) => {
	const { step } = await parent();
	if (step !== 'pin') redirect(303, '/setup/children');
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) redirect(303, '/login');
		const result = parsePin(await request.formData());
		if (!result.ok) return fail(400, { message: result.message });
		const scope = forFamily(getDb(), locals.user.familyId);
		if (scope.children().length === 0) redirect(303, '/setup/children');
		try {
			setFirstPin(scope, result.value);
		} catch (e) {
			if (!(e instanceof SetupClosed)) throw e;
		}
		// Steps 3 and 4 (recovery email, alerts) come with #17.
		redirect(303, '/');
	}
};
