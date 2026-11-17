// Types and wording shared by the grown-up chore pages.
import type { ChoreIconId } from './chore-icons';

export type Kid = { id: number; name: string; colour: string };
export type ChoreRow = {
	id: number;
	name: string;
	icon: ChoreIconId;
	stars: number;
	childIds: number[];
};
export type ChoreFields = Omit<ChoreRow, 'id'>;

/** "Mia, Leo", or "Nobody yet" when no child is assigned. */
export function whoDoesIt(childIds: number[], kids: Kid[]) {
	const names = kids.filter((k) => childIds.includes(k.id)).map((k) => k.name);
	return names.length ? names.join(', ') : 'Nobody yet';
}

/** Not in the designs: shown when saving a chore fails (for example the connection dropped). */
export const SAVE_FAILED = "That didn't save. Try again.";
