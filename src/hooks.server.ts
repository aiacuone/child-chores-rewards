import { error, redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import {
	SESSION_COOKIE,
	clearSessionCookie,
	setSessionCookie,
	validateSession
} from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db/app.ts';
import { testRoutesAllowed } from '#lib/server/test-routes.ts';

const PUBLIC_PATHS = ['/login', '/login/google', '/login/google/callback'];

export const handle: Handle = async ({ event, resolve }) => {
	// Test-only pages do not exist outside local test runs.
	if (event.url.pathname.startsWith('/test/')) {
		if (!testRoutesAllowed(event.url)) error(404, 'Not found');
		return resolve(event);
	}

	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = null;

	if (token) {
		const result = validateSession(getDb(), token);
		if (result) {
			event.locals.user = result.user;
			setSessionCookie(event.cookies, token, result.expiresAt, event.url.protocol === 'https:');
		} else {
			clearSessionCookie(event.cookies);
		}
	}

	const path = event.url.pathname;
	const isPublic =
		PUBLIC_PATHS.includes(path) ||
		path.startsWith('/_app/') ||
		path.startsWith('/icons/') ||
		/\.(png|svg|ico|webmanifest|js|css|woff2?)$/.test(path);

	if (!event.locals.user && !isPublic) {
		if (path.startsWith('/api/')) error(401, 'Not signed in');
		redirect(303, '/login');
	}

	return resolve(event);
};
