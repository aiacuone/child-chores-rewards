import { redirect } from '@sveltejs/kit';
import { beginGoogleAuth } from '#lib/server/google.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, locals, url }) => {
	if (locals.user) redirect(303, '/');
	const target = beginGoogleAuth(cookies, url.origin, url.protocol === 'https:');
	if (!target) redirect(303, '/login?error=failed');
	redirect(303, target, { external: ['https://accounts.google.com'] });
};
