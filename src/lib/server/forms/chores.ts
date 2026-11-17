// Server checks for a chore (Add-Stop, Edit-Stop). Bad input is refused, not fixed.
import { z } from 'zod';
import { CHORE_ICON_IDS, CHORE_STARS, MAX_CHORE_NAME } from '../../chore-icons';

// Any printable text: letters in any language, numbers, punctuation, emoji.
// No control or invisible formatting characters, and no spaces at either end.
const NAME = /^[^\p{C}\s](?:[^\p{C}]*[^\p{C}\s])?$/u;

export const choreInput = z.object({
	name: z.string().max(MAX_CHORE_NAME).regex(NAME),
	icon: z.enum(CHORE_ICON_IDS),
	stars: z
		.number()
		.int()
		.min(CHORE_STARS.min)
		.max(CHORE_STARS.max)
		.refine((n) => n % CHORE_STARS.step === 0),
	childIds: z
		.array(z.number().int().positive())
		.max(4)
		.refine((ids) => new Set(ids).size === ids.length)
});

export type ChoreInput = z.infer<typeof choreInput>;

/** Read a chore from a JSON body. Null when it is not a valid chore. */
export function parseChore(body: unknown): ChoreInput | null {
	const parsed = choreInput.safeParse(body);
	return parsed.success ? parsed.data : null;
}
