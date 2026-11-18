// Change PIN. It needs grown-up mode and the current PIN, and wrong tries count
// towards the pad's lock. Other devices in grown-up mode are locked out after.
// No PIN is ever logged or sent back.
import { json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { parsePinChange } from '#lib/server/forms/settings.ts';
import { changePin, GROWNUP_HEADER, requireGrownUp } from '#lib/server/grownup.ts';
import { pinRefusal } from '#lib/server/pin-check.ts';
import { readJson } from '#lib/server/read-json.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const input = parsePinChange(await readJson(event.request));
	if (!input.ok) return json({ message: input.message }, { status: 400 });
	const refused = await pinRefusal(scope, input.current, event.url.origin);
	if (refused) return json({ message: refused }, { status: 403 });
	changePin(scope, event.request.headers.get(GROWNUP_HEADER), input.pin);
	return new Response(null, { status: 204 });
};
