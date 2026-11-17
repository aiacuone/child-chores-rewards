import { fail, redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { parseChildren } from '#lib/server/forms/setup.ts';
import { SetupClosed, saveChildren } from '#lib/server/setup.ts';
import { maskEmail } from '#lib/mask.ts';
import type { Actions, PageServerLoad } from './$types';

// Setup step 1 (Setup-Children.dc.html). The layout has already checked that
// setup is still open.
export const load: PageServerLoad = async ({ locals }) => {
	const scope = forFamily(getDb(), locals.user!.familyId);
	return {
		email: maskEmail(locals.user!.email),
		children: scope.children().map(({ name, colour }) => ({ name, colour }))
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) redirect(303, '/login');
		const result = parseChildren(await request.formData());
		if (!result.ok) return fail(400, { message: result.message });
		try {
			saveChildren(forFamily(getDb(), locals.user.familyId), result.value);
		} catch (e) {
			if (e instanceof SetupClosed) redirect(303, '/');
			throw e;
		}
		redirect(303, '/setup/pin');
	}
};
