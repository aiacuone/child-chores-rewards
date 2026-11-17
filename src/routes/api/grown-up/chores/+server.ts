// The chores library for grown-up pages. Every request needs a working grown-up
// token (requireGrownUp) and reaches only the signed-in family's chores.
import { error, json } from '@sveltejs/kit';
import { addChore, listChores } from '#lib/server/chores.ts';
import { colourValue } from '#lib/colours.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily, NotInFamily } from '#lib/server/family.ts';
import { parseChore } from '#lib/server/forms/chores.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { readJson } from '#lib/server/read-json.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	return json({
		children: scope
			.children()
			.map((c) => ({ id: c.id, name: c.name, colour: colourValue(c.colour) })),
		chores: listChores(scope)
	});
};

export const POST: RequestHandler = async (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const input = parseChore(await readJson(event.request));
	if (!input) error(400, 'Bad request');
	try {
		return json({ id: addChore(scope, input) }, { status: 201 });
	} catch (e) {
		if (e instanceof NotInFamily) error(400, 'Bad request');
		throw e;
	}
};
