// Server checks for picture passcodes. Setting one needs three different
// pictures. A try only has to be three known pictures: a repeat is just wrong.
import { z } from 'zod';
import { PICTURE_IDS, type PictureId } from '../../passcode';

const picture = z.enum(PICTURE_IDS);
const three = z.object({ pictures: z.tuple([picture, picture, picture]) }).strict();

export function parsePasscodeTry(raw: unknown): PictureId[] | null {
	const parsed = three.safeParse(raw);
	return parsed.success ? parsed.data.pictures : null;
}

export function parseNewPasscode(raw: unknown): PictureId[] | null {
	const pictures = parsePasscodeTry(raw);
	return pictures && new Set(pictures).size === pictures.length ? pictures : null;
}
