// Server checks for a grown-up's answer on the check screen (Stop-Waiting,
// Not-Done, Reassign). Bad input is refused, not fixed.
import { z } from 'zod';
import { MAX_MESSAGE } from '../../check';
import { NAME } from './chores';

const answer = z.discriminatedUnion('action', [
	z.object({ action: z.literal('accept') }),
	z.object({ action: z.literal('undo') }),
	// A picked message or the grown-up's own: printable text, no spaces at the ends.
	z.object({
		action: z.literal('sendBack'),
		message: z.string().min(1).max(MAX_MESSAGE).regex(NAME)
	}),
	z.object({ action: z.literal('move'), childId: z.number().int().positive() })
]);

export type CheckAnswer = z.infer<typeof answer>;

export function parseAnswer(body: unknown): CheckAnswer | null {
	const r = answer.safeParse(body);
	return r.success ? r.data : null;
}
