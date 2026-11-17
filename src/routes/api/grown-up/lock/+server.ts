// Lock grown-up mode now: the token stops working on the server too.
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { GROWNUP_HEADER, endToken } from '#lib/server/grownup.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals, request }) => {
	endToken(forFamily(getDb(), locals.user!.familyId), request.headers.get(GROWNUP_HEADER));
	return new Response(null, { status: 204 });
};
