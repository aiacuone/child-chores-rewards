import { fail, redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { MESSAGES, parseEmail } from '#lib/server/forms/setup.ts';
import { EmailNotSent, sendEmail } from '#lib/server/email.ts';
import { TooManyEmails, dropLink, startVerification } from '#lib/server/recovery-email.ts';
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

		let link: { token: string; id: number };
		try {
			link = startVerification(scope, result.value);
		} catch (e) {
			if (e instanceof TooManyEmails) return fail(429, { message: MESSAGES.tooManyEmails });
			throw e;
		}

		const confirmUrl = `${url.origin}/verify-email?token=${link.token}`;
		try {
			await sendEmail({
				to: result.value,
				subject: 'Confirm your Rocket Rewards recovery email',
				text: `Open this link to use this address for PIN reset codes: ${confirmUrl}\n\nThe link works for 24 hours. If you didn't ask for this, you can ignore this email.`
			});
		} catch (e) {
			if (!(e instanceof EmailNotSent)) throw e;
			dropLink(scope, link.id);
			return fail(502, { message: MESSAGES.emailNotSent });
		}
		redirect(303, '/setup/alerts');
	}
};
