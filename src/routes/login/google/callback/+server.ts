import { redirect } from '@sveltejs/kit';
import {
	clearFailures,
	createSession,
	isRateLimited,
	recordFailure,
	setSessionCookie,
	signInGoogleUser
} from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db/app.ts';
import { fetchGoogleProfile, isAllowedEmail, takeOAuthCookies } from '#lib/server/google.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, getClientAddress, url }) => {
	const saved = takeOAuthCookies(cookies);
	if (url.searchParams.get('error')) redirect(303, '/login?error=cancelled');

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	if (!code || !state || !saved.verifier || state !== saved.state)
		redirect(303, '/login?error=failed');

	const ip = getClientAddress();
	if (isRateLimited(ip)) redirect(303, '/login?error=rate');

	const profile = await fetchGoogleProfile(code, saved.verifier, url.origin);
	if (!profile) {
		recordFailure(ip);
		redirect(303, '/login?error=failed');
	}

	// A known or invited account gets in. ALLOWED_EMAILS only says who may start
	// the first family (ADR 0017).
	const db = getDb();
	const user = signInGoogleUser(
		db,
		profile,
		isAllowedEmail(profile.email) ? 'first-only' : 'never'
	);
	if (!user) {
		recordFailure(ip);
		redirect(303, '/login?error=not_allowed');
	}
	clearFailures(ip);

	const { token, expiresAt } = createSession(db, user.id);
	setSessionCookie(cookies, token, expiresAt, url.protocol === 'https:');
	redirect(303, '/');
};
