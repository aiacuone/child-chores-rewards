// The rewards library for grown-up pages. Every request needs a working
// grown-up token (requireGrownUp) and reaches only the signed-in family's
// rewards and children.
import { error, json } from '@sveltejs/kit';
import { colourValue } from '#lib/colours.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily, NotInFamily } from '#lib/server/family.ts';
import { parseReward } from '#lib/server/forms/rewards.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { familyVersion } from '#lib/server/live.ts';
import { readJson } from '#lib/server/read-json.ts';
import { addReward, listRewards } from '#lib/server/rewards.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const version = familyVersion(scope);
	return json({
		version,
		children: scope
			.children()
			.map((c) => ({ id: c.id, name: c.name, colour: colourValue(c.colour) })),
		rewards: listRewards(scope)
	});
};

export const POST: RequestHandler = async (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const input = parseReward(await readJson(event.request));
	if (!input) error(400, 'Bad request');
	try {
		return json({ id: addReward(scope, input) }, { status: 201 });
	} catch (e) {
		if (e instanceof NotInFamily) error(400, 'Bad request');
		throw e;
	}
};
