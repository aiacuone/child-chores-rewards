// Remove a grown-up. Grown-up token required, and the device must be signed in
// as the family's owner. Another family's grown-up is "not found".
import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { removeGrownUp } from '#lib/server/invites.ts';
import { rowId } from '#lib/server/row-id.ts';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = (event) => {
	const user = event.locals.user!;
	const scope = forFamily(getDb(), user.familyId);
	requireGrownUp(event, scope);
	const id = rowId(event.params.id);
	if (user.role !== 'owner') error(403, 'Only the owner can remove a grown-up');
	if (!id) error(404, 'Not found');
	const result = removeGrownUp(scope, user, id);
	if (result === 'missing') error(404, 'Not found');
	if (result === 'forbidden') error(403, 'The owner cannot be removed');
	return new Response(null, { status: 204 });
};
