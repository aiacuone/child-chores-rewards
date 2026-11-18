// A child's new rocket photo. Children use this, so it needs a signed-in device,
// and the child's passcode when they have one (hooks.server.ts).
import { error, json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { readUploadedPhoto } from '#lib/server/image.ts';
import { photoUrl, savePhoto } from '#lib/server/photos.ts';
import { rowId } from '#lib/server/row-id.ts';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const scope = forFamily(getDb(), locals.user!.familyId);
	const id = rowId(params.childId);
	if (!id || !scope.child(id)) error(404, 'Not found');
	const photo = await readUploadedPhoto(request);
	if (!savePhoto(scope, 'child', id, photo)) error(404, 'Not found');
	return json({ photo: photoUrl(scope, 'child', id) });
};
