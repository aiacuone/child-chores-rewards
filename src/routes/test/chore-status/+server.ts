// Test-only: set one child's copy of a chore to a status, so Playwright can
// draw a trip with done stops before the grown-up check (#24) exists. hooks.server.ts answers 404 for every /test/ path
// unless test routes are allowed, so this never runs on the live site.
//
//   /test/chore-status?as=trip-1&chore=3&child=2&status=completed
import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/app.ts';
import { schema } from '#lib/server/db/index.ts';
import { forFamily } from '#lib/server/family.ts';
import type { RequestHandler } from './$types';

const STATUSES = ['pending', 'waiting', 'completed', 'skipped'] as const;

export const GET: RequestHandler = ({ url }) => {
	const as = url.searchParams.get('as') ?? 'grown-up';
	const status = url.searchParams.get('status') as (typeof STATUSES)[number];
	const chore = Number(url.searchParams.get('chore'));
	const child = Number(url.searchParams.get('child'));
	if (!/^[a-z0-9-]{1,30}$/.test(as) || !STATUSES.includes(status)) error(400, 'bad request');
	const db = getDb();
	const [user] = db
		.select()
		.from(schema.user)
		.where(eq(schema.user.googleSub, `test-${as}`))
		.all();
	if (!user) error(404, 'no such test user');
	const scope = forFamily(db, user.familyId);
	const changed = db
		.update(schema.choreCopy)
		.set({ status })
		.where(
			scope.where(
				schema.choreCopy,
				and(eq(schema.choreCopy.choreId, chore), eq(schema.choreCopy.childId, child))
			)
		)
		.run().changes;
	if (changed !== 1) error(404, 'no such copy');
	return new Response(null, { status: 204 });
};
