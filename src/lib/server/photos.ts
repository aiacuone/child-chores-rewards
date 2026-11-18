// Photos for rockets, chores and rewards (ADR 0011). Reads and writes are scoped
// to the family, and an image itself is only read when it is being shown.
import { eq } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';

const KINDS = {
	child: { photos: schema.childPhoto, owners: schema.child },
	chore: { photos: schema.chorePhoto, owners: schema.chore },
	reward: { photos: schema.rewardPhoto, owners: schema.reward }
};

export type PhotoKind = keyof typeof KINDS;
export const isPhotoKind = (kind: string | undefined): kind is PhotoKind =>
	kind === 'child' || kind === 'chore' || kind === 'reward';

// The three photo tables have the same columns; only their foreign keys differ.
const table = (kind: PhotoKind) => KINDS[kind].photos as typeof schema.childPhoto;
const address = (kind: PhotoKind, id: number, version: number) =>
	`/api/photos/${kind}/${id}?v=${version}`;

const forOwner = (scope: FamilyScope, kind: PhotoKind, id: number) =>
	scope.where(table(kind), eq(table(kind).ownerId, id));

function ownerExists(scope: FamilyScope, kind: PhotoKind, id: number) {
	const owners = KINDS[kind].owners as typeof schema.child;
	return (
		scope.db
			.select({ id: owners.id })
			.from(owners)
			.where(scope.where(owners, eq(owners.id, id)))
			.all().length > 0
	);
}

function version(scope: FamilyScope, kind: PhotoKind, id: number) {
	const [row] = scope.db
		.select({ version: table(kind).version })
		.from(table(kind))
		.where(forOwner(scope, kind, id))
		.all();
	return row?.version ?? null;
}

/** The address of one photo, or null when there is none. */
export function photoUrl(scope: FamilyScope, kind: PhotoKind, id: number) {
	const current = version(scope, kind, id);
	return current === null ? null : address(kind, id, current);
}

/** Every photo address of this kind in the family, by owner id, for lists. */
export function photoUrls(scope: FamilyScope, kind: PhotoKind) {
	const rows = scope.db
		.select({ id: table(kind).ownerId, version: table(kind).version })
		.from(table(kind))
		.where(scope.where(table(kind)))
		.all();
	return new Map(rows.map((r) => [r.id, address(kind, r.id, r.version)]));
}

export function readPhoto(scope: FamilyScope, kind: PhotoKind, id: number) {
	const [row] = scope.db
		.select({ data: table(kind).data, version: table(kind).version })
		.from(table(kind))
		.where(forOwner(scope, kind, id))
		.all();
	return row ?? null;
}

/** Store or replace a photo. False when its owner is not in this family. */
export function savePhoto(
	scope: FamilyScope,
	kind: PhotoKind,
	id: number,
	data: Buffer,
	now = Date.now()
) {
	if (!ownerExists(scope, kind, id)) return false;
	const next = Math.max(now, (version(scope, kind, id) ?? 0) + 1);
	scope.db
		.insert(table(kind))
		.values({ ownerId: id, familyId: scope.familyId, data, version: next })
		.onConflictDoUpdate({ target: table(kind).ownerId, set: { data, version: next } })
		.run();
	return true;
}

/** False when the owner is not in this family. */
export function removePhoto(scope: FamilyScope, kind: PhotoKind, id: number) {
	if (!ownerExists(scope, kind, id)) return false;
	scope.db
		.delete(table(kind))
		.where(forOwner(scope, kind, id))
		.run();
	return true;
}
