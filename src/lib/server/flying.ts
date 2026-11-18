// What Who's flying and a child's trip show about each child: name, colour,
// rank and stars. Only the signed-in family's children are reachable.
import { colourValue } from '../colours';
import { photoUrl } from './photos';
import type { FamilyScope } from './family';
import { standing } from './stars';

export type ChildCard = {
	id: number;
	name: string;
	colour: string;
	rank: ReturnType<typeof standing>['rank'];
	stars: number;
	/** The address of their rocket photo, or null. */
	photo: string | null;
};

function card(
	scope: FamilyScope,
	c: { id: number; name: string; colour: Parameters<typeof colourValue>[0] }
): ChildCard {
	const { stars, rank } = standing(scope, c.id);
	return {
		id: c.id,
		name: c.name,
		colour: colourValue(c.colour),
		rank,
		stars,
		photo: photoUrl(scope, 'child', c.id)
	};
}

export function childCards(scope: FamilyScope) {
	return scope.children().map((c) => card(scope, c));
}

/** One child's card, or null when the id is not a child in this family. */
export function childCard(scope: FamilyScope, childId: number) {
	if (!Number.isSafeInteger(childId) || childId <= 0) return null;
	const c = scope.child(childId);
	return c ? card(scope, c) : null;
}
