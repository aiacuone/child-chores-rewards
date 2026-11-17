// The rocket colours a child can pick at setup (Setup-Children). The names are
// what screen readers say for each colour circle.
export const COLOURS = [
	{ id: 'pink', label: 'Pink', value: '#F28AA0' },
	{ id: 'blue', label: 'Blue', value: '#6EC6F0' },
	{ id: 'purple', label: 'Purple', value: '#9C8CF0' },
	{ id: 'green', label: 'Green', value: '#5BB58A' }
] as const;

export type ColourId = (typeof COLOURS)[number]['id'];

export const COLOUR_IDS = COLOURS.map((c) => c.id) as [ColourId, ...ColourId[]];

/** The colour's CSS value, for a child's rocket and top bar. */
export const colourValue = (id: ColourId) => COLOURS.find((c) => c.id === id)!.value;
