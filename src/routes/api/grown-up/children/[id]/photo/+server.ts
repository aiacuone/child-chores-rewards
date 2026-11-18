// A grown-up takes down a child's rocket photo. Grown-up token required.
import { error } from '@sveltejs/kit';
import { removeChildPhoto } from '#lib/server/child-photo.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { rowId } from '#lib/server/row-id.ts';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const id = rowId(event.params.id);
	if (!id || !removeChildPhoto(scope, id)) error(404, 'Not found');
	return new Response(null, { status: 204 });
};
