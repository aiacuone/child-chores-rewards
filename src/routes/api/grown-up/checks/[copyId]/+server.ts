// One chore a child marked done: read it, or answer it (accept, undo the
// accept, send back, or move to the right child). Grown-up token required; a
// copy from another family, or an id that is not a whole number, is "not
// found". An answer that no longer fits (another grown-up got there first, or
// the undo minute is up) is 409.
import { error, json } from '@sveltejs/kit';
import { accept, checkDetails, moveTo, sendBack, undoAccept } from '#lib/server/check.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { parseAnswer } from '#lib/server/forms/check.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { familyVersion } from '#lib/server/live.ts';
import { readJson } from '#lib/server/read-json.ts';
import { childCards } from '#lib/server/flying.ts';
import type { RequestEvent } from './$types';

function setup(event: RequestEvent) {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const id = /^\d{1,9}$/.test(event.params.copyId) ? Number(event.params.copyId) : NaN;
	return { scope, id };
}

export const GET = (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const version = familyVersion(scope);
	const details = checkDetails(scope, id);
	if (!details) error(404, 'Not found');
	return json({ version, ...details, children: childCards(scope) });
};

export const POST = async (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const answer = parseAnswer(await readJson(event.request));
	if (!answer) error(400, 'Bad request');
	if (!checkDetails(scope, id)) error(404, 'Not found');
	if (answer.action === 'move' && !scope.child(answer.childId)) error(400, 'Bad request');
	const done =
		answer.action === 'accept'
			? accept(scope, id)
			: answer.action === 'undo'
				? undoAccept(scope, id)
				: answer.action === 'sendBack'
					? sendBack(scope, id, answer.message)
					: moveTo(scope, id, answer.childId);
	if (!done) error(409, 'Already answered');
	return new Response(null, { status: 204 });
};
