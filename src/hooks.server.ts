import { redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import {
	SESSION_COOKIE,
	clearSessionCookie,
	setSessionCookie,
	validateSession
} from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db/app.ts';
import { startResetJob } from '#lib/server/reset.ts';
import { addSecurityHeaders } from '#lib/server/security-headers.ts';
import { testRoutesAllowed } from '#lib/server/test-routes.ts';

// /verify-email is opened from an email, often on a device that is not signed in.
const PUBLIC_PATHS = ['/login', '/login/google', '/login/google/callback', '/verify-email'];

// The daily reset runs inside the app (ADR 0010). Starting it here also
// catches up a reset missed while the app was stopped.
export const init: ServerInit = () => {
	if (!building) startResetJob(getDb());
};

export const handle: Handle = async (input) => {
	const response = await guard(input);
	addSecurityHeaders(response.headers);
	return response;
};

// Every response gets the security headers. The one exception is the redirect
// to /login thrown below: SvelteKit builds it after this hook, and it has no
// body for the headers to protect.
const guard: Handle = async ({ event, resolve }) => {
	// Test-only pages do not exist outside local test runs.
	if (event.url.pathname.startsWith('/test/')) {
		if (!testRoutesAllowed(event.url)) return new Response('Not found', { status: 404 });
		return resolve(event);
	}

	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = null;
	event.locals.sessionId = null;

	if (token) {
		const result = validateSession(getDb(), token);
		if (result) {
			event.locals.user = result.user;
			event.locals.sessionId = result.sessionId;
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
		if (path.startsWith('/api/')) return new Response('Not signed in', { status: 401 });
		redirect(303, '/login');
	}

	return resolve(event);
};
