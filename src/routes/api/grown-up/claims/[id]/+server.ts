// One reward claim: read it, or answer it (hand it out, or decline it with a
// message). Grown-up token required; a claim from another family, or an id that
// is not a whole number, is "not found". An answer that no longer fits (another
// grown-up got there first) is 409, and so is a hand-out when the child no
// longer has the stars (`reason: "short"`).
import { error, json } from '@sveltejs/kit';
import { claimDetails, decline, handOut } from '#lib/server/claims.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { parseClaimAnswer } from '#lib/server/forms/claims.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { familyVersion } from '#lib/server/live.ts';
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
	const version = familyVersion(scope);
	const details = claimDetails(scope, id);
	if (!details) error(404, 'Not found');
	return json({ version, ...details });
};

export const POST = async (event: RequestEvent) => {
	const { scope, id } = setup(event);
	const answer = parseClaimAnswer(await readJson(event.request));
	if (!answer) error(400, 'Bad request');
	if (!claimDetails(scope, id)) error(404, 'Not found');
	if (answer.action === 'decline') {
		if (!decline(scope, id, answer.message)) error(409, 'Already answered');
	} else {
		const result = handOut(scope, id);
		if (result !== 'ok') return json({ reason: result }, { status: 409 });
	}
	return new Response(null, { status: 204 });
};
