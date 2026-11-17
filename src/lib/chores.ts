// Types and wording shared by the grown-up chore pages.
import type { ChoreIconId } from './chore-icons';
import type { Repeat, RepeatInput } from './repeat';

export type Kid = { id: number; name: string; colour: string };
export type ChoreRow = {
	id: number;
	name: string;
	icon: ChoreIconId;
	stars: number;
	repeat: Repeat;
	childIds: number[];
};
/** What the chore form sends: a custom repeat's start is added by the server. */
export type ChoreFields = Omit<ChoreRow, 'id' | 'repeat'> & { repeat: RepeatInput };

/** The form's fields from a saved chore. */
export function choreFields(c: ChoreRow): ChoreFields {
	const { repeat } = c;
	return {
		name: c.name,
		icon: c.icon,
		stars: c.stars,
		childIds: c.childIds,
		repeat:
			repeat.kind === 'custom' ? { kind: 'custom', every: repeat.every, unit: repeat.unit } : repeat
	};
}

/** "Mia, Leo", or "Nobody yet" when no child is assigned. */
export function whoDoesIt(childIds: number[], kids: Kid[]) {
	const names = kids.filter((k) => childIds.includes(k.id)).map((k) => k.name);
	return names.length ? names.join(', ') : 'Nobody yet';
}

/** Not in the designs: shown when saving a chore fails (for example the connection dropped). */
export const SAVE_FAILED = "That didn't save. Try again.";
