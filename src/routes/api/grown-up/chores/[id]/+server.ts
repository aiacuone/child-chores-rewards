// One chore: read, change, skip, hide or remove it. Grown-up token required; a
// chore from another family, or an id that is not a whole number, is "not found".
import { error, json } from '@sveltejs/kit';
import { settleFamilyBonuses } from '#lib/server/bonus.ts';
import { applyChoreAction, BadSkip, choreToday } from '#lib/server/chore-state.ts';
import { BadRepeat, getChore, removeChore, updateChore } from '#lib/server/chores.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily, NotInFamily } from '#lib/server/family.ts';
import { parseChore, parseChoreAction } from '#lib/server/forms/chores.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { readJson } from '#lib/server/read-json.ts';
import type { RequestEvent } from './$types';

function setup(event: RequestEvent) {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const id = /^\d{1,9}$/.test(event.params.id) ? Number(event.params.id) : NaN;
	return { scope, id };
}

export const GET = (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const chore = getChore(scope, id);
	if (!chore) error(404, 'Not found');
	return json({ ...chore, today: choreToday(scope, id) });
};

/** Skip, hide or turn back on. */
export const POST = async (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const action = parseChoreAction(await readJson(event.request));
	if (!action) error(400, 'Bad request');
	try {
		if (!applyChoreAction(scope, id, action)) error(404, 'Not found');
	} catch (e) {
		if (e instanceof BadSkip) error(400, 'Bad request');
		throw e;
	}
	return new Response(null, { status: 204 });
};

export const PUT = async (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const input = parseChore(await readJson(event.request));
	if (!input) error(400, 'Bad request');
	try {
		if (!updateChore(scope, id, input)) error(404, 'Not found');
		// Removing a child or changing the repeat can leave a trip all Done.
		settleFamilyBonuses(scope);
	} catch (e) {
		if (e instanceof NotInFamily || e instanceof BadRepeat) error(400, 'Bad request');
		throw e;
	}
	return new Response(null, { status: 204 });
};

export const DELETE = (event: RequestEvent) => {
	const { scope, id } = setup(event);
	if (!removeChore(scope, id)) error(404, 'Not found');
	settleFamilyBonuses(scope);
	return new Response(null, { status: 204 });
};
