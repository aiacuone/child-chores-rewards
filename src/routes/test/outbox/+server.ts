// Test-only: the emails and alerts captured instead of being sent (outbox.ts).
// hooks.server.ts answers 404 for /test/ unless test routes are allowed.
import { json } from '@sveltejs/kit';
import { outbox } from '#lib/server/outbox.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => json(outbox);
