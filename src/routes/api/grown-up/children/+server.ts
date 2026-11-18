// The family's children for Settings. Grown-up token required, and only the
// signed-in family's children are reached.
import { json } from '@sveltejs/kit';
import { addChild, listChildren } from '#lib/server/children.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { MAX_CHILDREN, parseChild } from '#lib/server/forms/setup.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { familyVersion } from '#lib/server/live.ts';
import { readJson } from '#lib/server/read-json.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const version = familyVersion(scope);
	const children = listChildren(scope);
	return json({
		version,
		children,
		canAdd: children.length < MAX_CHILDREN,
		takenColours: scope.children().map((c) => c.colour)
	});
};

export const POST: RequestHandler = async (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const input = parseChild(await readJson(event.request));
	if (!input.ok) return json({ message: input.message }, { status: 400 });
	const saved = addChild(scope, input.value);
	if (!saved.ok) return json({ message: saved.message }, { status: 409 });
	return json({ id: saved.id }, { status: 201 });
};
