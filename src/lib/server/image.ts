// Uploaded images are never stored as sent. The first bytes must be a JPEG, PNG
// or WebP, so nothing else reaches the decoder, and the picture is rebuilt as a
// small WebP. Rebuilding drops anything hidden in the file, such as its location.
import { error } from '@sveltejs/kit';
import sharp from 'sharp';

/** Below the server's 512 KB body limit. The page sends about 100 KB. */
export const MAX_UPLOAD = 500 * 1024;
const MAX_STORED = 150 * 1024;
const PHOTO_SIZE = 400;
const MIN_SIDE = 64;
const MAX_SIDE = 4096;

sharp.concurrency(1);

export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function imageKind(data: Buffer) {
	if (data.length < 12) return null;
	if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpeg';
	if (data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])))
		return 'png';
	const riff = data.toString('latin1', 0, 4) === 'RIFF';
	return riff && data.toString('latin1', 8, 12) === 'WEBP' ? 'webp' : null;
}

/** A clean square WebP made from the upload, or null when it is not a usable photo. */
export async function reencodePhoto(data: Buffer) {
	const kind = imageKind(data);
	if (!kind || data.length > MAX_UPLOAD) return null;
	try {
		const image = sharp(data, {
			failOn: 'error',
			limitInputPixels: MAX_SIDE * MAX_SIDE,
			animated: false
		});
		const { format, width, height, pages } = await image.metadata();
		if (format !== kind || (pages ?? 1) > 1) return null;
		if (Math.min(width, height) < MIN_SIDE || Math.max(width, height) > MAX_SIDE) return null;
		const output = await image
			.rotate()
			.resize(PHOTO_SIZE, PHOTO_SIZE, { fit: 'cover' })
			.flatten({ background: '#ffffff' })
			.webp({ quality: 78 })
			.toBuffer();
		return output.length <= MAX_STORED ? output : null;
	} catch {
		return null;
	}
}

/** Check an upload request and return the rebuilt photo, or refuse it. */
export async function readUploadedPhoto(request: Request) {
	if (!UPLOAD_TYPES.includes(request.headers.get('content-type') ?? ''))
		error(415, 'Use a JPEG, PNG or WebP photo');
	if (Number(request.headers.get('content-length') ?? 0) > MAX_UPLOAD) error(413, 'Too large');
	const body = Buffer.from(await request.arrayBuffer());
	if (body.length > MAX_UPLOAD) error(413, 'Too large');
	const photo = await reencodePhoto(body);
	if (!photo) error(400, 'Not a usable photo');
	return photo;
}
