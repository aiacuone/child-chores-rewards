import { redirect } from '@sveltejs/kit';
import { forFamily } from '#lib/server/family.ts';
import { getDb } from '#lib/server/db/app.ts';
import { checkedNotice, clearCheckedNotices } from '#lib/server/check.ts';
import { comingUp, justSent, tripStops, undoIDidIt } from '#lib/server/trip.ts';
import type { Actions, PageServerLoad } from './$types';

const wholeNumber = (raw: string | null) => (raw && /^\d{1,9}$/.test(raw) ? Number(raw) : NaN);

// Today's stops, how many chores are coming up on other days, and the messages:
// after "I did it!" (?sent=<chore>) while Undo is still allowed, "checked!" once
// after a grown-up accepts, and a grown-up's "Not done yet" message.
export const load: PageServerLoad = async ({ locals, parent, url }) => {
	const { child } = await parent();
	const scope = forFamily(getDb(), locals.user!.familyId);
	const sentId = wholeNumber(url.searchParams.get('sent'));
	const sent = Number.isNaN(sentId) ? null : justSent(scope, child.id, sentId);
	const stops = tripStops(scope, child.id);
	return {
		stops,
		checked: checkedNotice(scope, child.id),
		said: stops.findLast((s) => s.message) ?? null,
		comingUp: comingUp(scope, child.id).length,
		sent: sent && { ...sent, moved: url.searchParams.get('moved') === '1' }
	};
};

export const actions: Actions = {
	// "checked!" has been shown, so it does not show again. No redirect: the
	// trip stays as it is.
	seen: async ({ locals, params, request }) => {
		const scope = forFamily(getDb(), locals.user!.familyId);
		const child = scope.child(wholeNumber(params.childId));
		const upTo = wholeNumber(((await request.formData()).get('upTo') as string | null) ?? null);
		if (child && !Number.isNaN(upTo)) clearCheckedNotices(scope, child.id, upTo);
		return { seen: true };
	},
	// Undo "I did it!", only while a grown-up has not checked it and within the minute.
	undo: async ({ locals, params, request }) => {
		const scope = forFamily(getDb(), locals.user!.familyId);
		const child = scope.child(wholeNumber(params.childId));
		if (!child) redirect(303, '/');
		const form = await request.formData();
		const chore = form.get('chore');
		undoIDidIt(scope, child.id, wholeNumber(typeof chore === 'string' ? chore : null));
		redirect(303, `/trip/${child.id}`);
	}
};
