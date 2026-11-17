// Check a PIN from the pad (src/lib/server/grownup.ts). The PIN is never logged
// or sent back. Answers { result: 'ok', token }, { result: 'wrong' } or
// { result: 'locked', until }.
import { error, json } from '@sveltejs/kit';
import { ALERTS, AlertNotSent, familyTopic, sendAlert } from '#lib/server/alerts.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { unlock } from '#lib/server/grownup.ts';
import { isPin } from '#lib/server/pin.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request, url }) => {
	if (!locals.user || !locals.sessionId) error(401, 'Not signed in');
	const text = await request.text();
	if (text.length > 100) error(400, 'Bad request');
	let pin: unknown;
	try {
		pin = (JSON.parse(text) as { pin?: unknown }).pin;
	} catch {
		error(400, 'Bad request');
	}
	if (!isPin(pin)) error(400, 'Bad request');

	const scope = forFamily(getDb(), locals.user.familyId);
	const result = unlock(scope, locals.sessionId, pin);
	if (result.ok) return json({ result: 'ok', token: result.token });
	if (result.reason === 'wrong') return json({ result: 'wrong' });

	// The first lock in a run of wrong tries tells every grown-up (no names or details).
	if (result.firstLock) {
		const topic = familyTopic(scope);
		if (topic)
			await sendAlert(topic, { ...ALERTS.pinLocked, click: `${url.origin}/grown-up` }).catch(
				(e) => {
					if (!(e instanceof AlertNotSent)) throw e;
				}
			);
	}
	return json({ result: 'locked', until: result.until });
};
