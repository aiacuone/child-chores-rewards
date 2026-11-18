// One child's star history (Star-History.dc.html). Grown-up token required: a
// child's device has no token, so children cannot read it. A child from another
// family, or an id that is not a whole number, is "not found".
import { error, json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { childCard } from '#lib/server/flying.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { starHistory } from '#lib/server/history.ts';
import { familyVersion } from '#lib/server/live.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const id = /^\d{1,9}$/.test(event.params.childId) ? Number(event.params.childId) : NaN;
	const version = familyVersion(scope);
	const child = childCard(scope, id);
	if (!child) error(404, 'Not found');
	return json({ version, child, days: starHistory(scope, id) });
};
