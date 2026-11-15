import { redirect } from '@sveltejs/kit';
import { isFirstRun } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db/app.ts';
import type { PageServerLoad } from './$types';

// Not in the designs: short, kind messages for a failed sign-in (see docs/SPEC.md).
const ERRORS: Record<string, string> = {
	cancelled: 'Sign-in was cancelled. Try again when you are ready.',
	failed: 'Google sign-in did not work. Try again.',
	not_allowed: 'That Google account is not on the list.',
	rate: 'Too many tries. Try again in 15 minutes.'
};

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, '/');
	return {
		firstRun: isFirstRun(getDb()),
		error: ERRORS[url.searchParams.get('error') ?? ''] ?? ''
	};
};
