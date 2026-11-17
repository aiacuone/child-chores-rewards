// Is the PIN pad locked? The pad asks when it opens, so a locked pad shows its
// countdown on every device. hooks.server.ts refuses /api/ when signed out.
import { json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/app.ts';
import { forFamily } from '#lib/server/family.ts';
import { padLockedUntil } from '#lib/server/grownup.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) =>
	json({ lockedUntil: padLockedUntil(forFamily(getDb(), locals.user!.familyId)) });
