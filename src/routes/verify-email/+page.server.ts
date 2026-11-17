import { getDb } from '#lib/server/db/app.ts';
import { confirmLink, linkEmail } from '#lib/server/recovery-email.ts';
import { maskEmail } from '#lib/mask.ts';
import type { Actions, PageServerLoad } from './$types';

// The page the confirm link opens. It works without signing in: the token in
// the link proves the email reached that inbox. Opening the link changes
// nothing; only the Confirm button does, so email scanners that open links
// cannot confirm an address by themselves.
export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const email = linkEmail(getDb(), url.searchParams.get('token'));
	return { email: email ? maskEmail(email) : null };
};

export const actions: Actions = {
	default: async ({ url }) => ({ confirmed: confirmLink(getDb(), url.searchParams.get('token')) })
};
