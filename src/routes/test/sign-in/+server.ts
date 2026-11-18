// Test-only sign-in for Playwright. hooks.server.ts answers 404 for every
// /test/ path unless test routes are allowed, so this never runs on the live site.
//
//   /test/sign-in                    the shared test grown-up, setup finished
//   /test/sign-in?as=new-family-1    a separate grown-up and family
//   ...&setup=new                    leave setup unfinished (no children, no PIN)
//   ...&invited=1                    sign in as the live site would: only a known
//                                    or invited account gets in
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createSession, setSessionCookie, signInGoogleUser } from '#lib/server/auth.ts';
import { getDb } from '#lib/server/db/app.ts';
import { schema } from '#lib/server/db/index.ts';
import { forFamily } from '#lib/server/family.ts';
import { saveChildren, setFirstPin, setupStep } from '#lib/server/setup.ts';
import { ensureTopic } from '#lib/server/alerts.ts';
import type { RequestHandler } from './$types';

// The PIN the finished test family uses (e2e/helpers.ts has the same value).
const TEST_PIN = '1234';

export const GET: RequestHandler = ({ cookies, url }) => {
	const as = url.searchParams.get('as') ?? 'grown-up';
	if (!/^[a-z0-9-]{1,30}$/.test(as)) error(400, 'bad as');
	const db = getDb();
	const signedIn = signInGoogleUser(
		db,
		{
			sub: `test-${as}`,
			email: `${as}@example.test`,
			name: as === 'grown-up' ? 'Test grown-up' : `Test ${as}`
		},
		url.searchParams.has('invited') ? 'never' : 'always'
	);
	if (!signedIn) redirect(303, '/login?error=not_allowed');
	const { id } = signedIn;

	if (url.searchParams.get('setup') !== 'new') {
		const [user] = db.select().from(schema.user).where(eq(schema.user.id, id)).all();
		const scope = forFamily(db, user.familyId);
		if (setupStep(scope) !== 'done') {
			saveChildren(scope, [
				{ name: 'Mia', colour: 'pink' },
				{ name: 'Leo', colour: 'blue' }
			]);
			setFirstPin(scope, TEST_PIN);
			ensureTopic(scope);
			db.update(schema.family)
				.set({ setupDoneAt: new Date() })
				.where(eq(schema.family.id, scope.familyId))
				.run();
		}
	}

	const { token, expiresAt } = createSession(db, id);
	setSessionCookie(cookies, token, expiresAt, url.protocol === 'https:');
	redirect(303, '/');
};
