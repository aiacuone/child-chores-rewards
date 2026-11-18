// Set, change or turn off a child's picture passcode. Grown-up token required;
// the pictures are never sent back.
import { error } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { parseNewPasscode } from '#lib/server/forms/passcode.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { childIdFrom, removePasscode, setPasscode } from '#lib/server/passcode.ts';
import { readJson } from '#lib/server/read-json.ts';
import type { RequestEvent } from './$types';

function setup(event: RequestEvent) {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const id = childIdFrom(event.params.id);
	if (!id) error(404, 'Not found');
	return { scope, id };
}

export const PUT = async (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const pictures = parseNewPasscode(await readJson(event.request));
	if (!pictures) error(400, 'Bad request');
	if (!setPasscode(scope, id, pictures)) error(404, 'Not found');
	return new Response(null, { status: 204 });
};

export const DELETE = (event: RequestEvent) => {
	const { scope, id } = setup(event);
	if (!removePasscode(scope, id)) error(404, 'Not found');
	return new Response(null, { status: 204 });
};
