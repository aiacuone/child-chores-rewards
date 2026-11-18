// Test-only: the emails and alerts captured instead of being sent (outbox.ts).
// hooks.server.ts answers 404 for /test/ unless test routes are allowed.
// `?as=<test user>` keeps only the alerts for that user's family topic, so
// tests running side by side do not see each other's alerts.
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { familyTopic } from '#lib/server/alerts.ts';
import { getDb } from '#lib/server/db/app.ts';
import { schema } from '#lib/server/db/index.ts';
import { forFamily } from '#lib/server/family.ts';
import { outbox } from '#lib/server/outbox.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const as = url.searchParams.get('as');
	if (as === null) return json(outbox);
	if (!/^[a-z0-9-]{1,30}$/.test(as)) error(400, 'bad request');
	const db = getDb();
	const [user] = db
		.select()
		.from(schema.user)
		.where(eq(schema.user.googleSub, `test-${as}`))
		.all();
	if (!user) error(404, 'no such test user');
	const topic = familyTopic(forFamily(db, user.familyId));
	return json({ ...outbox, alerts: outbox.alerts.filter((a) => a.topic === topic) });
};
