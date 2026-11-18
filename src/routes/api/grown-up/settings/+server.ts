// Settings: read everything the rows show, or change some settings. Grown-up
// token required, and only the signed-in family's settings are reached.
import { error, json } from '@sveltejs/kit';
import { maskEmail } from '#lib/mask.ts';
import { ensureTopic } from '#lib/server/alerts.ts';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { parseSettings } from '#lib/server/forms/settings.ts';
import { requireGrownUp } from '#lib/server/grownup.ts';
import { readJson } from '#lib/server/read-json.ts';
import { recoveryEmail } from '#lib/server/recovery-email.ts';
import { getSettings, updateSettings } from '#lib/server/settings.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const recovery = recoveryEmail(scope);
	return json({
		settings: getSettings(scope),
		signedInAs: maskEmail(event.locals.user!.email),
		recovery: recovery ? maskEmail(recovery) : null,
		topic: ensureTopic(scope),
		children: scope.children().map((c) => c.name)
	});
};

export const PUT: RequestHandler = async (event) => {
	const scope = forFamily(getDb(), event.locals.user!.familyId);
	requireGrownUp(event, scope);
	const changes = parseSettings(await readJson(event.request));
	if (!changes) error(400, 'Bad request');
	const settings = updateSettings(scope, changes);
	// A new auto-lock applies to this grown-up's open session straight away.
	requireGrownUp(event, scope);
	return json({ settings });
};
