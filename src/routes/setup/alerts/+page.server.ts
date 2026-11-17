import { fail, redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { MESSAGES } from '#lib/server/forms/setup.ts';
import { ALERTS, AlertNotSent, ensureTopic, sendAlert } from '#lib/server/alerts.ts';
import { finishSetup, setupStep } from '#lib/server/setup.ts';
import type { Actions, PageServerLoad } from './$types';

// Setup step 4 (Setup-Alerts.dc.html): show the family's secret ntfy topic,
// send a test alert, and finish setup.
export const load: PageServerLoad = async ({ locals }) => ({
	topic: ensureTopic(forFamily(getDb(), locals.user!.familyId))
});

function stepFourScope(familyId: number) {
	const scope = forFamily(getDb(), familyId);
	if (setupStep(scope) !== 'alerts') redirect(303, '/setup');
	return scope;
}

export const actions: Actions = {
	test: async ({ locals }) => {
		if (!locals.user) redirect(303, '/login');
		const scope = stepFourScope(locals.user.familyId);
		try {
			await sendAlert(ensureTopic(scope), ALERTS.test);
		} catch (e) {
			if (!(e instanceof AlertNotSent)) throw e;
			return fail(502, { message: MESSAGES.alertNotSent });
		}
	},
	finish: async ({ locals }) => {
		if (!locals.user) redirect(303, '/login');
		finishSetup(stepFourScope(locals.user.familyId));
		redirect(303, '/setup/done');
	}
};
