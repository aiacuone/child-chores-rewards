// "Send a test alert" (Ntfy.dc.html). Grown-up token required.
import { error } from '@sveltejs/kit';
import { ALERTS, AlertNotSent, ensureTopic, sendAlert } from '#lib/server/alerts.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	try {
		await sendAlert(ensureTopic(scope), ALERTS.test);
	} catch (e) {
		if (e instanceof AlertNotSent) error(502, 'Not sent');
		throw e;
	}
	return new Response(null, { status: 204 });
};
