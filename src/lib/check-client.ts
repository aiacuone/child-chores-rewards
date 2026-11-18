// The grown-up check pages' calls to /api/grown-up/checks (browser only).
import { grownupFetch } from './grownup.svelte';
import type { ChildCard } from './server/flying';
import type { CheckDetails } from './server/check';

export type CheckView = CheckDetails & { version: number; children: ChildCard[] };
export type Answer =
	| { action: 'accept' }
	| { action: 'undo' }
	| { action: 'sendBack'; message: string }
	| { action: 'move'; childId: number };

/** One copy to check, or null when it is not this family's. */
export async function fetchCheck(copyId: string): Promise<CheckView | null> {
	const res = await grownupFetch(`/api/grown-up/checks/${copyId}`);
	return res.ok ? ((await res.json()) as CheckView) : null;
}

/** Send an answer. True when it was saved; false when it no longer fits or failed. */
export async function answer(copyId: number | string, body: Answer) {
	const res = await grownupFetch(`/api/grown-up/checks/${copyId}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	return res.ok;
}
