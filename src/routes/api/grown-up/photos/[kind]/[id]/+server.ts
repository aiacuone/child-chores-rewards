// A grown-up adds or removes a chore or reward photo, or removes a rocket photo.
// Grown-up token required; anything outside the family is "not found".
import { error, json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { readUploadedPhoto } from '#lib/server/image.ts';
import { isPhotoKind, photoUrl, removePhoto, savePhoto } from '#lib/server/photos.ts';
import { rowId } from '#lib/server/row-id.ts';
import type { RequestEvent } from './$types';

function setup(event: RequestEvent) {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const id = rowId(event.params.id);
	const { kind } = event.params;
	if (!id || !isPhotoKind(kind)) error(404, 'Not found');
	return { scope, id, kind };
}

export const PUT = async (event: RequestEvent) => {
	const { scope, id, kind } = setup(event);
	if (kind === 'child') error(404, 'Not found');
	const photo = await readUploadedPhoto(event.request);
	if (!savePhoto(scope, kind, id, photo)) error(404, 'Not found');
	return json({ photo: photoUrl(scope, kind, id) });
};

export const DELETE = (event: RequestEvent) => {
	const { scope, id, kind } = setup(event);
	if (!removePhoto(scope, kind, id)) error(404, 'Not found');
	return new Response(null, { status: 204 });
};
