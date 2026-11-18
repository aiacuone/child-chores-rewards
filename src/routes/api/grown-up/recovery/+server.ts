// The recovery email in Settings (Recovery, Recovery-Edit). Grown-up token
// required. Changing it also needs the PIN again, and wrong tries count towards
// the same lock as the pad. The old address stays in use until the new one's
// link is confirmed (/verify-email), which is also when grown-ups are alerted.
import { json } from '@sveltejs/kit';
import { maskEmail } from '#lib/mask.ts';
import { ALERTS, sendSafetyAlert } from '#lib/server/alerts.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { MESSAGES, parseEmailValue } from '#lib/server/forms/setup.ts';
import { checkPin, requireGrownUp } from '#lib/server/grownup.ts';
import { isPin } from '#lib/server/pin.ts';
import { readJson } from '#lib/server/read-json.ts';
import { recoveryEmail } from '#lib/server/recovery-email.ts';
import { sendConfirmLink } from '#lib/server/recovery-send.ts';
import type { RequestHandler } from './$types';

const clock = (ms: number) => {
	const s = Math.ceil(ms / 1000);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const GET: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const email = recoveryEmail(scope);
	return json({ email: email ? maskEmail(email) : null });
};

export const POST: RequestHandler = async (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const body = (await readJson(event.request)) as { email?: unknown; pin?: unknown } | null;
	const email = parseEmailValue(body?.email);
	if (!email.ok) return json({ message: email.message }, { status: 400 });
	if (!isPin(body?.pin)) return json({ message: 'Wrong PIN, try again.' }, { status: 403 });

	const pin = checkPin(scope, body.pin);
	if (!pin.ok) {
		if (pin.reason === 'wrong') return json({ message: 'Wrong PIN, try again.' }, { status: 403 });
		if (pin.firstLock) await sendSafetyAlert(scope, ALERTS.pinLocked, event.url.origin);
		const left = clock(pin.until - Date.now());
		return json({ message: `Too many tries. Try again in ${left}.` }, { status: 403 });
	}

	const sent = await sendConfirmLink(scope, email.value, event.url.origin);
	if (sent === 'tooMany') return json({ message: MESSAGES.tooManyEmails }, { status: 429 });
	if (sent === 'notSent') return json({ message: MESSAGES.emailNotSent }, { status: 502 });
	return new Response(null, { status: 204 });
};
