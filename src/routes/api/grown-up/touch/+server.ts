// The grown-up screen was touched: keep grown-up mode open for another
// AUTO_LOCK. 401 when the token no longer works, and the page then locks.
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = (event) => {
	requireGrownUp(event, forFamily(getDb(), event.locals.user!.familyId));
	return new Response(null, { status: 204 });
};
