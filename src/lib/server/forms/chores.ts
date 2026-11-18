// Server checks for a chore (Add-Stop, Edit-Stop). Bad input is refused, not fixed.
import { z } from 'zod';
import { CHORE_ICON_IDS, CHORE_STARS, MAX_CHORE_NAME, MAX_EXPECTATIONS } from '../../chore-icons';
import { isDate, REPEAT_LIMITS } from '../../repeat';

// Any printable text: letters in any language, numbers, punctuation, emoji.
// No control or invisible formatting characters, and no spaces at either end.
export const NAME = /^[^\p{C}\s](?:[^\p{C}]*[^\p{C}\s])?$/u;

// When it repeats. Whether a Once date is in the coming week is checked in
// chores.ts, which knows today's date and the chore's saved date.
const repeatInput = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('daily') }),
	z.object({
		kind: z.literal('weekly'),
		days: z
			.array(z.number().int().min(0).max(6))
			.min(1)
			.max(7)
			.refine((d) => new Set(d).size === d.length)
	}),
	z.object({
		kind: z.literal('monthly'),
		day: z.number().int().min(REPEAT_LIMITS.monthDay.min).max(REPEAT_LIMITS.monthDay.max)
	}),
	z.object({
		kind: z.literal('custom'),
		every: z.number().int().min(REPEAT_LIMITS.every.min).max(REPEAT_LIMITS.every.max),
		unit: z.enum(['days', 'weeks'])
	}),
	z.object({ kind: z.literal('once'), date: z.string().refine(isDate) })
]);

export const choreInput = z.object({
	name: z.string().max(MAX_CHORE_NAME).regex(NAME),
	// Optional: the same rules as the name, or empty.
	expectations: z.string().max(MAX_EXPECTATIONS).regex(NAME).or(z.literal('')),
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
		.refine((ids) => new Set(ids).size === ids.length),
	repeat: repeatInput
});

export type ChoreInput = z.infer<typeof choreInput>;

/** Read a chore from a JSON body. Null when it is not a valid chore. */
export function parseChore(body: unknown): ChoreInput | null {
	const parsed = choreInput.safeParse(body);
	return parsed.success ? parsed.data : null;
}
