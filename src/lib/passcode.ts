// The nine pictures a child's passcode is made from (Passcode-Setup,
// Passcode-Enter). The ids are also what screen readers say.
export const PICTURE_IDS = [
	'rocket',
	'star',
	'planet',
	'book',
	'paw',
	'toys',
	'plate',
	'car',
	'gift'
] as const;

export type PictureId = (typeof PICTURE_IDS)[number];

export const PASSCODE_LENGTH = 3;
