// The built-in chore pictures (Add-Stop.dc.html), drawn in ChoreIcon.svelte.
// The label is what screen readers say.
export const CHORE_ICONS = [
	{ id: 'bed', label: 'Bed' },
	{ id: 'paw', label: 'Paw' },
	{ id: 'toys', label: 'Toys' },
	{ id: 'book', label: 'Book' },
	{ id: 'plate', label: 'Plate' },
	{ id: 'bin', label: 'Bin' }
] as const;

export type ChoreIconId = (typeof CHORE_ICONS)[number]['id'];
export const CHORE_ICON_IDS = CHORE_ICONS.map((i) => i.id) as [ChoreIconId, ...ChoreIconId[]];

/** Stars for a chore: 5 to 100 in steps of 5, starting at 10. */
export const CHORE_STARS = { min: 5, max: 100, step: 5, start: 10 } as const;
export const MAX_CHORE_NAME = 40;
