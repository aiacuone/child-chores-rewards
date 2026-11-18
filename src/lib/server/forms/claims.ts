// Server checks for a grown-up's answer to a reward claim (Claim-Parent,
// Claim-Decline). Bad input is refused, not fixed.
import { z } from 'zod';
import { MAX_MESSAGE } from '../../claims';
import { NAME } from './chores';

const answer = z.discriminatedUnion('action', [
	z.object({ action: z.literal('handOut') }),
	// A picked message or the grown-up's own: printable text, no spaces at the ends.
	z.object({
		action: z.literal('decline'),
		message: z.string().min(1).max(MAX_MESSAGE).regex(NAME)
	})
]);

export type ClaimAnswer = z.infer<typeof answer>;

export function parseClaimAnswer(body: unknown): ClaimAnswer | null {
	const r = answer.safeParse(body);
	return r.success ? r.data : null;
}
