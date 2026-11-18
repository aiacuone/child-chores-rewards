// Adding, changing and removing children from Settings (Settings-Children,
// Child-Edit, Child-Remove). Removing a child takes their chore copies, stars,
// claims and passcode with them through the database's cascades.
import { and, eq } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { settleFamilyBonuses } from './bonus';
import { childCard, childCards } from './flying';
import { MAX_CHILDREN, MESSAGES, type ChildInput } from './forms/setup';
import { passcodeChildIds } from './passcode';

type Saved = { ok: true; id: number } | { ok: false; message: string };

function refusal(scope: FamilyScope, input: ChildInput, exceptId?: number) {
	const others = scope.children().filter((c) => c.id !== exceptId);
	const name = input.name.toLocaleLowerCase();
	if (others.some((c) => c.name.toLocaleLowerCase() === name)) return MESSAGES.sameName;
	if (others.some((c) => c.colour === input.colour)) return MESSAGES.sameColour;
	return null;
}

export function listChildren(scope: FamilyScope) {
	const guarded = passcodeChildIds(scope);
	return childCards(scope).map((c) => ({ ...c, passcode: guarded.has(c.id) }));
}

/** One child for the Edit screen, or null when not in this family. */
export function childDetail(scope: FamilyScope, childId: number) {
	const row = scope.child(childId);
	const card = childCard(scope, childId);
	if (!row || !card) return null;
	const others = scope.children().filter((c) => c.id !== childId);
	return {
		...card,
		colourId: row.colour,
		passcode: passcodeChildIds(scope).has(childId),
		takenColours: others.map((c) => c.colour),
		canRemove: others.length > 0
	};
}

export function addChild(scope: FamilyScope, input: ChildInput): Saved {
	if (scope.children().length >= MAX_CHILDREN)
		return { ok: false, message: MESSAGES.tooManyChildren };
	const message = refusal(scope, input);
	if (message) return { ok: false, message };
	return { ok: true, id: scope.addChild(input.name, input.colour).id };
}

/** Null when the child is not in this family. */
export function updateChild(scope: FamilyScope, id: number, input: ChildInput): Saved | null {
	if (!scope.child(id)) return null;
	const message = refusal(scope, input, id);
	if (message) return { ok: false, message };
	scope.db
		.update(schema.child)
		.set(input)
		.where(and(scope.where(schema.child), eq(schema.child.id, id)))
		.run();
	return { ok: true, id };
}

/** Null when the child is not in this family. The last child cannot be removed. */
export function removeChild(scope: FamilyScope, id: number, now = new Date()): Saved | null {
	if (!scope.child(id)) return null;
	if (scope.children().length <= 1) return { ok: false, message: MESSAGES.lastChild };
	scope.db
		.delete(schema.child)
		.where(and(scope.where(schema.child), eq(schema.child.id, id)))
		.run();
	settleFamilyBonuses(scope, now);
	return { ok: true, id };
}
