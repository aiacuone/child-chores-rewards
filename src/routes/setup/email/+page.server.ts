import { fail, redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { MESSAGES, parseEmail } from '#lib/server/forms/setup.ts';
import { sendConfirmLink } from '#lib/server/recovery-send.ts';
import { OPEN_PAGES, setupStep } from '#lib/server/setup.ts';
import type { Actions } from './$types';

// Setup step 3 (Setup-Email.dc.html): send a confirm link to the recovery
// email. The address is used only once the link is confirmed (/verify-email).
export const actions: Actions = {
	default: async ({ locals, request, url }) => {
		if (!locals.user) redirect(303, '/login');
		const scope = forFamily(getDb(), locals.user.familyId);
		if (!OPEN_PAGES[setupStep(scope)].includes('email')) redirect(303, '/setup');

		const result = parseEmail(await request.formData());
		if (!result.ok) return fail(400, { message: result.message });

		const sent = await sendConfirmLink(scope, result.value, url.origin);
		if (sent === 'tooMany') return fail(429, { message: MESSAGES.tooManyEmails });
		if (sent === 'notSent') return fail(502, { message: MESSAGES.emailNotSent });
		redirect(303, '/setup/alerts');
	}
};
