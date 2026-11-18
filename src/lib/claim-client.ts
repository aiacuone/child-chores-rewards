// The grown-up claim pages' calls to /api/grown-up/claims (browser only).
import { grownupFetch } from './grownup.svelte';
import type { ClaimDetails } from './server/claims';

export type ClaimView = ClaimDetails & { version: number };
export type ClaimAnswer = { action: 'handOut' } | { action: 'decline'; message: string };

/** One claim, or null when it is not this family's. */
export async function fetchClaim(claimId: string): Promise<ClaimView | null> {
	const res = await grownupFetch(`/api/grown-up/claims/${claimId}`);
	return res.ok ? ((await res.json()) as ClaimView) : null;
}

/** Send an answer: 'ok', 'short' (not enough stars now), 'gone' (answered already) or 'failed'. */
export async function answerClaim(claimId: number | string, body: ClaimAnswer) {
	const res = await grownupFetch(`/api/grown-up/claims/${claimId}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (res.ok) return 'ok' as const;
	if (res.status === 409) {
		const reason = ((await res.json().catch(() => ({}))) as { reason?: string }).reason;
		return reason === 'short' ? ('short' as const) : ('gone' as const);
	}
	return 'failed' as const;
}
