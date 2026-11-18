// Mission control (Parent-Home.dc.html): today's progress for every child and
// the chores waiting for a check. Grown-up token required; only the signed-in
// family's children and chores.
import { json } from '@sveltejs/kit';
import { toCheck } from '#lib/server/check.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { childCards } from '#lib/server/flying.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { familyVersion } from '#lib/server/live.ts';
import { tripStops } from '#lib/server/trip.ts';
import { choreDay, weekday, WEEKDAYS } from '#lib/repeat.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const version = familyVersion(scope);
	const now = new Date();
	const children = childCards(scope).map((child) => {
		const stops = tripStops(scope, child.id, now);
		return {
			...child,
			states: stops.map((s) => s.state),
			next: stops.find((s) => s.state === 'next')?.name ?? null
		};
	});
	return json({
		version,
		day: WEEKDAYS[weekday(choreDay(now))].long,
		children,
		checks: toCheck(scope)
	});
};
