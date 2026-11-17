// The signed-in family's version, for screens that refresh themselves
// (src/lib/components/LiveUpdates.svelte). hooks.server.ts answers 401 when the
// device is not signed in.
import { json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { familyVersion } from '#lib/server/live.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) =>
	json(
		{ version: familyVersion(forFamily(getDb(), locals.user!.familyId)) },
		{ headers: { 'cache-control': 'no-store' } }
	);
