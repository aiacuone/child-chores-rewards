// Sign-in and devices (Devices.dc.html). Grown-up token required.
// { "scope": "others" } ends every other session in the family, whichever
// grown-up it belongs to; { "scope": "this" } signs this device out.
import { error } from '@sveltejs/kit';
import {
	SESSION_COOKIE,
	clearSessionCookie,
	invalidateSession,
	signOutOtherDevices
} from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { readJson } from '#lib/server/read-json.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const db = getDb();
	const { user, sessionId } = event.locals;
	requireGrownUp(event, forFamily(db, user!.familyId));
	const scope = ((await readJson(event.request)) as { scope?: unknown } | null)?.scope;
	if (scope === 'others') signOutOtherDevices(db, user!.familyId, sessionId!);
	else if (scope === 'this') {
		invalidateSession(db, event.cookies.get(SESSION_COOKIE)!);
		clearSessionCookie(event.cookies);
	} else error(400, 'Bad request');
	return new Response(null, { status: 204 });
};
