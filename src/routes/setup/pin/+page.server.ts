import { fail, redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { parsePin } from '#lib/server/forms/setup.ts';
import { SetupClosed, setFirstPin } from '#lib/server/setup.ts';
import type { Actions } from './$types';

// Setup step 2 (Setup-PIN.dc.html). The PIN is hashed at once and is never
// logged or sent back to the page, even when the form is refused.
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
			// The PIN is already set: change nothing and go to the current step.
			if (e instanceof SetupClosed) redirect(303, '/setup');
			throw e;
		}
		redirect(303, '/setup/email');
	}
};
