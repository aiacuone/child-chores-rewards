// The Ranks tab (Ranks.dc.html): every child's rank and stars. Grown-up token
// required; only the signed-in family's children.
import { json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { childCards } from '#lib/server/flying.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { familyVersion } from '#lib/server/live.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	return json({ version: familyVersion(scope), children: childCards(scope) });
};
