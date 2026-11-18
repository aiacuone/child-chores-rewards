// Cancel an invite. Grown-up token required; another family's invite is "not found".
import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { cancelInvite } from '#lib/server/invites.ts';
import { rowId } from '#lib/server/row-id.ts';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const id = rowId(event.params.id);
	if (!id || !cancelInvite(scope, id)) error(404, 'Not found');
	return new Response(null, { status: 204 });
};
