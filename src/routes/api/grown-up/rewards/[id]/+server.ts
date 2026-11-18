// One reward: read, change or remove it. Grown-up token required; a reward
// from another family, or an id that is not a whole number, is "not found".
import { error, json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily, NotInFamily } from '#lib/server/family.ts';
import { parseReward } from '#lib/server/forms/rewards.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { readJson } from '#lib/server/read-json.ts';
import { getReward, removeReward, updateReward } from '#lib/server/rewards.ts';
import type { RequestEvent } from './$types';

function setup(event: RequestEvent) {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const id = /^\d{1,9}$/.test(event.params.id) ? Number(event.params.id) : NaN;
	return { scope, id };
}

export const GET = (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const reward = getReward(scope, id);
	if (!reward) error(404, 'Not found');
	return json(reward);
};

export const PUT = async (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const input = parseReward(await readJson(event.request));
	if (!input) error(400, 'Bad request');
	try {
		if (!updateReward(scope, id, input)) error(404, 'Not found');
	} catch (e) {
		if (e instanceof NotInFamily) error(400, 'Bad request');
		throw e;
	}
	return new Response(null, { status: 204 });
};

export const DELETE = (event: RequestEvent) => {
	const { scope, id } = setup(event);
	if (!removeReward(scope, id)) error(404, 'Not found');
	return new Response(null, { status: 204 });
};
