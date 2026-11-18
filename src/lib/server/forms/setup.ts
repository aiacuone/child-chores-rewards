// Server checks for the setup forms (Setup-Children, Setup-PIN). Every field is
// checked here whatever the page allowed, and bad input is refused, not fixed.
import { z } from 'zod';
import { COLOUR_IDS, type ColourId } from '../../colours';

import { MAX_CHILDREN, MAX_NAME } from '../../setup-limits';

export { MAX_CHILDREN, MAX_NAME };

export const MESSAGES = {
	noName: 'Add a name for each child.',
	badName: `Use up to ${MAX_NAME} letters for each name.`,
	sameName: 'Each child needs their own name.',
	sameColour: 'Each child needs their own colour.',
	pinShape: 'Use 4 numbers.',
	pinMatch: "The PINs don't match. Try again.",
	badEmail: 'Check the email address.',
	emailNotSent: "The email didn't send. Try again.",
	tooManyEmails: 'Too many emails. Try again in an hour.',
	alertNotSent: "The test alert didn't send. Try again.",
	tooManyChildren: `You can add up to ${MAX_CHILDREN} children.`,
	lastChild: 'Keep at least one child.'
} as const;

// Letters in any language, with spaces, hyphens, apostrophes and full stops
// between them (Mary-Jane, O'Neil, Zoë). No digits, symbols or control characters.
const NAME = /^\p{L}[\p{L}\p{M}]*(?:[ '’.-]\p{L}[\p{L}\p{M}]*)*\.?$/u;

const child = z.object({
	name: z.string().max(MAX_NAME).regex(NAME),
	colour: z.enum(COLOUR_IDS)
});

export type ChildInput = { name: string; colour: ColourId };

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

/**
 * Read the children rows from the form: fields name-0, colour-0, name-1, ...
 * A row whose name is left blank is skipped, so an extra empty "Add another
 * child" row does no harm; at least one child is needed.
 */
export function parseChildren(form: FormData): Result<ChildInput[]> {
	for (const key of form.keys()) {
		const m = /^(name|colour)-(\d+)$/.exec(key);
		if (!m || Number(m[2]) >= MAX_CHILDREN || form.getAll(key).length !== 1)
			return { ok: false, message: MESSAGES.noName };
	}

	const rows: ChildInput[] = [];
	for (let i = 0; i < MAX_CHILDREN; i++) {
		const rawName = form.get(`name-${i}`);
		if (rawName === null) continue;
		if (typeof rawName !== 'string') return { ok: false, message: MESSAGES.noName };
		const name = rawName.trim();
		if (name === '') continue;
		const parsed = child.safeParse({ name, colour: form.get(`colour-${i}`) });
		if (!parsed.success) {
			const colourBad = parsed.error.issues.some((i) => i.path[0] === 'colour');
			return {
				ok: false,
				message: colourBad ? MESSAGES.sameColour : MESSAGES.badName
			};
		}
		rows.push(parsed.data);
	}

	if (rows.length === 0) return { ok: false, message: MESSAGES.noName };
	const names = rows.map((r) => r.name.toLocaleLowerCase());
	if (new Set(names).size !== names.length) return { ok: false, message: MESSAGES.sameName };
	if (new Set(rows.map((r) => r.colour)).size !== rows.length)
		return { ok: false, message: MESSAGES.sameColour };
	return { ok: true, value: rows };
}

/** Read one child from a grown-up's form. Bad input is refused, never tidied up. */
export function parseChild(raw: unknown): Result<ChildInput> {
	const shape = z
		.object({ name: z.string().max(200), colour: z.unknown() })
		.strict()
		.safeParse(raw);
	if (!shape.success) return { ok: false, message: MESSAGES.noName };
	const name = shape.data.name.trim();
	if (name === '') return { ok: false, message: MESSAGES.noName };
	const parsed = child.safeParse({ name, colour: shape.data.colour });
	if (parsed.success) return { ok: true, value: parsed.data };
	const colourBad = parsed.error.issues.some((i) => i.path[0] === 'colour');
	return { ok: false, message: colourBad ? MESSAGES.sameColour : MESSAGES.badName };
}

const pinForm = z.object({ pin: z.string(), again: z.string() });

/** Read the PIN and its repeat. Only 4 digits are allowed, and both must match. */
export function parsePin(form: FormData): Result<string> {
	const parsed = pinForm.safeParse({
		pin: form.get('pin'),
		again: form.get('again')
	});
	if (!parsed.success || !/^\d{4}$/.test(parsed.data.pin))
		return { ok: false, message: MESSAGES.pinShape };
	if (parsed.data.pin !== parsed.data.again) return { ok: false, message: MESSAGES.pinMatch };
	return { ok: true, value: parsed.data.pin };
}

// A plain address: no spaces, quotes, angle brackets or line breaks, at most 254 characters.
const email = z.email().max(254);

/** Read the recovery email. It is refused, not cleaned, when it is not a plain address. */
export function parseEmail(form: FormData): Result<string> {
	return parseEmailValue(form.get('email'));
}

export function parseEmailValue(raw: unknown): Result<string> {
	if (typeof raw !== 'string') return { ok: false, message: MESSAGES.badEmail };
	const parsed = email.safeParse(raw.trim());
	if (!parsed.success) return { ok: false, message: MESSAGES.badEmail };
	return { ok: true, value: parsed.data };
}
