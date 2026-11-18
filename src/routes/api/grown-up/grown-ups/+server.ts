// The family's grown-ups and invites. Grown-up token required, and only the
// signed-in family is reached.
import { json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { MESSAGES, parseEmailValue } from '#lib/server/forms/setup.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { grownUpsView, sendInvite } from '#lib/server/invites.ts';
import { familyVersion } from '#lib/server/live.ts';
import { readJson } from '#lib/server/read-json.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const version = familyVersion(scope);
	return json({ version, ...grownUpsView(scope, event.locals.user!) });
};

const REFUSED = {
	joined: { message: MESSAGES.alreadyJoined, status: 409 },
	tooMany: { message: MESSAGES.tooManyEmails, status: 429 },
	notSent: { message: MESSAGES.emailNotSent, status: 502 }
} as const;

export const POST: RequestHandler = async (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const body = (await readJson(event.request)) as { email?: unknown } | null;
	const email = parseEmailValue(body?.email);
	if (!email.ok) return json({ message: email.message }, { status: 400 });
	const result = await sendInvite(scope, email.value, event.url.origin);
	if (result === 'sent') return json({ email: email.value.toLowerCase() }, { status: 201 });
	const { message, status } = REFUSED[result];
	return json({ message }, { status });
};
