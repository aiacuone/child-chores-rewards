// A child's try at their pictures. Children use this, so it needs a signed-in
// device and not grown-up mode. Tries are limited in passcode.ts.
import { error, json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { parsePasscodeTry } from '#lib/server/forms/passcode.ts';
import { childIdFrom, tryPasscode } from '#lib/server/passcode.ts';
import { readJson } from '#lib/server/read-json.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const scope = forFamily(getDb(), locals.user!.familyId);
	const id = childIdFrom(params.childId);
	if (!id || !scope.child(id) || !locals.sessionId) error(404, 'Not found');
	const pictures = parsePasscodeTry(await readJson(request));
	if (!pictures) error(400, 'Bad request');
	return json(tryPasscode(scope, locals.sessionId, id, pictures));
};
