// A rocket, chore or reward photo, for signed-in devices of its family only.
// Each version never changes, so the browser may keep it, privately.
import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { isPhotoKind, readPhoto } from '#lib/server/photos.ts';
import { rowId } from '#lib/server/row-id.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params, request, url }) => {
	const id = rowId(params.id);
	if (!id || !isPhotoKind(params.kind)) error(404, 'Not found');
	const photo = readPhoto(forFamily(getDb(), locals.user!.familyId), params.kind, id);
	if (!photo) error(404, 'Not found');
	const etag = `"${photo.version}"`;
	const headers = {
		etag,
		'cache-control':
			url.searchParams.get('v') === String(photo.version)
				? 'private, max-age=31536000, immutable'
				: 'private, no-cache'
	};
	if (request.headers.get('if-none-match') === etag)
		return new Response(null, { status: 304, headers });
	return new Response(new Uint8Array(photo.data), {
		headers: { ...headers, 'content-type': 'image/webp' }
	});
};
