import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { parsePin } from '#lib/server/forms/setup.ts';
import { isResetCode } from '#lib/server/pin.ts';
import { resetState, useResetCode } from '#lib/server/pin-reset.ts';
import type { Actions, PageServerLoad } from './$types';

// Set a new PIN (PIN-Reset, PIN-Reset-Wrong, PIN-Reset-Expired). The new PIN is
// checked first, so a typing slip there does not use up a try of the code.
// Neither the code nor the PIN is ever sent back to the page.
export const load: PageServerLoad = ({ locals, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const state = resetState(forFamily(getDb(), locals.user!.familyId));
	if (state === 'none') redirect(303, '/forgot-pin');
	return { cancelled: state === 'cancelled' };
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const form = await request.formData();
		const pin = parsePin(form);
		if (!pin.ok) return fail(400, { message: pin.message });
		const code = form.get('code');
		if (!isResetCode(code)) return fail(400, { wrongCode: true });
		const result = useResetCode(forFamily(getDb(), locals.user!.familyId), code, pin.value);
		if (result === 'wrong') return fail(400, { wrongCode: true });
		// Cancelled: the page loads again and shows PIN-Reset-Expired.
		redirect(303, result === 'ok' ? '/grown-up' : '/forgot-pin/reset');
	}
};
