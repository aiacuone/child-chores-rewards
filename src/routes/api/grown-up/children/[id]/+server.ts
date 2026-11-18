// One child: read, change or remove. Grown-up token required; a child from
// another family, or an id that is not a whole number, is "not found".
import { error, json } from '@sveltejs/kit';
import { childDetail, removeChild, updateChild } from '#lib/server/children.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { parseChild } from '#lib/server/forms/setup.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { childIdFrom } from '#lib/server/passcode.ts';
import { readJson } from '#lib/server/read-json.ts';
import type { RequestEvent } from './$types';

function setup(event: RequestEvent) {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const id = childIdFrom(event.params.id);
	if (!id) error(404, 'Not found');
	return { scope, id };
}

export const GET = (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const child = childDetail(scope, id);
	if (!child) error(404, 'Not found');
	return json(child);
};

export const PUT = async (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const input = parseChild(await readJson(event.request));
	if (!input.ok) return json({ message: input.message }, { status: 400 });
	const saved = updateChild(scope, id, input.value);
	if (!saved) error(404, 'Not found');
	if (!saved.ok) return json({ message: saved.message }, { status: 409 });
	return new Response(null, { status: 204 });
};

export const DELETE = (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const removed = removeChild(scope, id);
	if (!removed) error(404, 'Not found');
	if (!removed.ok) return json({ message: removed.message }, { status: 409 });
	return new Response(null, { status: 204 });
};
