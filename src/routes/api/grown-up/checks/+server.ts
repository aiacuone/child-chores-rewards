// Chores waiting for a grown-up (TO CHECK). Grown-up token required; only the
// signed-in family's chores.
import { json } from '@sveltejs/kit';
import { toCheck } from '#lib/server/check.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { familyVersion } from '#lib/server/live.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const version = familyVersion(scope);
	return json({ version, checks: toCheck(scope) });
};
