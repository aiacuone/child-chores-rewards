import { defineEnvVars } from '@sveltejs/kit/env';

// Server-only settings, read when the app starts. On the VM they come from
// /etc/rocket-rewards/app.env; locally from .env (never committed).
export const variables = defineEnvVars({
	// Optional so the app can be built and tested without them; sign-in
	// stays off until both are set.
	GOOGLE_CLIENT_ID: { description: 'Google OAuth client ID', schema: (value) => value || undefined },
	GOOGLE_CLIENT_SECRET: {
		description: 'Google OAuth client secret',
		schema: (value) => value || undefined
	},
	ALLOWED_EMAILS: {
		description: 'Google emails that may sign in, separated by commas or spaces',
		schema: (value) => value || undefined
	},
	// Only for Playwright on a developer's machine or in CI. Never set on the VM.
	// Even when set, the test pages answer only on localhost (see test-routes.ts).
	TEST_ROUTES: {
		description: 'Set to 1 to turn on the test-only sign-in and preview pages',
		schema: (value) => value === '1'
	},
	DATABASE_FILE: {
		description: 'Path to the SQLite file',
		schema: (value) => value || 'data/rocket-rewards.db'
	}
});
