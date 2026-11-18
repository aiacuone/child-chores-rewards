// A child's new rocket photo. Children use this, so it needs a signed-in device,
// and the child's passcode when they have one (hooks.server.ts).
import { error, json } from '@sveltejs/kit';
import { childPhotoUrl, saveChildPhoto } from '#lib/server/child-photo.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { MAX_UPLOAD, UPLOAD_TYPES, reencodePhoto } from '#lib/server/image.ts';
import { rowId } from '#lib/server/row-id.ts';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const scope = forFamily(getDb(), locals.user!.familyId);
	const id = rowId(params.childId);
	if (!id || !scope.child(id)) error(404, 'Not found');
	if (!UPLOAD_TYPES.includes(request.headers.get('content-type') ?? ''))
		error(415, 'Use a JPEG, PNG or WebP photo');
	if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD) error(413, 'Too large');
	const body = Buffer.from(await request.arrayBuffer());
	if (body.length > MAX_UPLOAD) error(413, 'Too large');
	const photo = await reencodePhoto(body);
	if (!photo) error(400, 'Not a usable photo');
	if (!saveChildPhoto(scope, id, photo)) error(404, 'Not found');
	return json({ photo: childPhotoUrl(scope, id) });
};
