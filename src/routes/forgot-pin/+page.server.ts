import { fail, redirect } from '@sveltejs/kit';
import { maskEmail } from '#lib/mask.ts';
import { ALERTS, sendSafetyAlert } from '#lib/server/alerts.ts';
import { getDb } from '#lib/server/db/app.ts';
import { EmailNotSent, sendEmail } from '#lib/server/email.ts';
import { forFamily } from '#lib/server/family.ts';
import { MESSAGES } from '#lib/server/forms/setup.ts';
import {
	CODE_MINUTES,
	TooManyCodes,
	dropCode,
	resetTarget,
	startReset
} from '#lib/server/pin-reset.ts';
import type { Actions, PageServerLoad } from './$types';

// Forgot your PIN? (PIN-Forgot.dc.html). It needs a signed-in device, not the
// PIN, and still works while the pad is locked. The code only goes to the
// family's confirmed recovery email, and every grown-up is told.
export const load: PageServerLoad = ({ locals, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const target = resetTarget(forFamily(getDb(), locals.user!.familyId));
	if (!target.hasPin) redirect(303, '/');
	return { email: target.email ? maskEmail(target.email) : null };
};

export const actions: Actions = {
	default: async ({ locals, url }) => {
		const scope = forFamily(getDb(), locals.user!.familyId);
		const { hasPin, email } = resetTarget(scope);
		if (!hasPin) redirect(303, '/');
		if (!email) return fail(400, { message: MESSAGES.badEmail });

		let reset: { code: string; id: number };
		try {
			reset = startReset(scope);
		} catch (e) {
			if (e instanceof TooManyCodes) return fail(429, { message: MESSAGES.tooManyEmails });
			throw e;
		}
		try {
			await sendEmail({
				to: email,
				subject: 'Your Rocket Rewards PIN reset code',
				text: `Your PIN reset code is ${reset.code}\n\nIt works for ${CODE_MINUTES} minutes. If you didn't ask for this, you can ignore this email and your PIN stays the same.`
			});
		} catch (e) {
			if (!(e instanceof EmailNotSent)) throw e;
			dropCode(scope, reset.id);
			return fail(502, { message: MESSAGES.emailNotSent });
		}
		await sendSafetyAlert(scope, ALERTS.pinResetSent, url.origin);
		redirect(303, '/forgot-pin/reset');
	}
};
