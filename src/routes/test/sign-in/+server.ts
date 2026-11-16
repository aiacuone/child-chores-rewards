// Test-only sign-in for Playwright. hooks.server.ts answers 404 for every
// /test/ path unless test routes are allowed, so this never runs on the live site.
import { redirect } from '@sveltejs/kit';
import { createSession, setSessionCookie, signInGoogleUser } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db/app.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies, url }) => {
	const db = getDb();
	const { id } = signInGoogleUser(db, {
		sub: 'test-grown-up',
		email: 'grown-up@example.test',
		name: 'Test grown-up'
	});
	const { token, expiresAt } = createSession(db, id);
	setSessionCookie(cookies, token, expiresAt, url.protocol === 'https:');
	redirect(303, '/');
};
