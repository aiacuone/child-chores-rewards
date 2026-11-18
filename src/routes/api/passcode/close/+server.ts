// Who's flying calls this on arrival: trips opened with pictures on this device
// close, so the next child has to tap them again.
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { closeTrips } from '#lib/server/passcode.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals }) => {
	if (locals.sessionId) closeTrips(forFamily(getDb(), locals.user!.familyId), locals.sessionId);
	return new Response(null, { status: 204 });
};
