import { redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { ALERTS, familyTopic, sendAlert } from '#lib/server/alerts.ts';
import { iDidIt, openStop } from '#lib/server/trip.ts';
import type { Actions, PageServerLoad } from './$types';

// "Are you Mia?" (Confirm-Who.dc.html), after "I did it!". Like the stop page,
// it only opens for the child's own unfinished stop today.
const choreId = (raw: string) => (/^\d{1,9}$/.test(raw) ? Number(raw) : NaN);

export const load: PageServerLoad = async ({ locals, params, parent }) => {
	const { child } = await parent();
	const scope = forFamily(getDb(), locals.user!.familyId);
	if (!openStop(scope, child.id, choreId(params.choreId))) redirect(303, `/trip/${child.id}`);
	return {};
};

export const actions: Actions = {
	// "Yes, I'm Mia": the stop goes to Grown-up checking, and every grown-up
	// gets the chore alert. A second tap changes nothing and sends nothing.
	default: async ({ locals, params, url }) => {
		const scope = forFamily(getDb(), locals.user!.familyId);
		const child = scope.child(choreId(params.childId));
		if (!child) redirect(303, '/');
		const id = choreId(params.choreId);
		const sent = iDidIt(scope, child.id, id);
		if (!sent) redirect(303, `/trip/${child.id}`);
		const topic = familyTopic(scope);
		// Temporary fix: the alert opens grown-up mode, not the chore's check screen, until #24.
		if (topic) {
			sendAlert(topic, { ...ALERTS.choreWaiting, click: `${url.origin}/grown-up` }).catch(() => {});
		}
		redirect(303, `/trip/${child.id}?sent=${id}${sent.moved ? '&moved=1' : ''}`);
	}
};
