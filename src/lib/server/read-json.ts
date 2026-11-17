// Read a small JSON request body. Anything over the limit, or not JSON, is
// refused with 400 rather than read.
import { error } from '@sveltejs/kit';

export async function readJson(request: Request, limit = 2000): Promise<unknown> {
	const text = await request.text();
	if (text.length > limit) error(400, 'Bad request');
	try {
		return JSON.parse(text);
	} catch {
		error(400, 'Bad request');
	}
}
