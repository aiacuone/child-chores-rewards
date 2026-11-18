// The photos in children's rocket windows (ADR 0011). Reads and writes are scoped
// to the family, and the image itself is only read when it is being shown.
import { eq } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';

const forChild = (scope: FamilyScope, childId: number) =>
	scope.where(schema.childPhoto, eq(schema.childPhoto.childId, childId));

function photoVersion(scope: FamilyScope, childId: number) {
	const [row] = scope.db
		.select({ version: schema.childPhoto.version })
		.from(schema.childPhoto)
		.where(forChild(scope, childId))
		.all();
	return row?.version ?? null;
}

/** The address of the child's photo, or null when there is none. */
export function childPhotoUrl(scope: FamilyScope, childId: number) {
	const version = photoVersion(scope, childId);
	return version === null ? null : `/api/photos/child/${childId}?v=${version}`;
}

export function readChildPhoto(scope: FamilyScope, childId: number) {
	const [row] = scope.db
		.select({ data: schema.childPhoto.data, version: schema.childPhoto.version })
		.from(schema.childPhoto)
		.where(forChild(scope, childId))
		.all();
	return row ?? null;
}

/** Store or replace the photo. False when the child is not in this family. */
export function saveChildPhoto(
	scope: FamilyScope,
	childId: number,
	data: Buffer,
	now = Date.now()
) {
	if (!scope.child(childId)) return false;
	const version = Math.max(now, (photoVersion(scope, childId) ?? 0) + 1);
	scope.db
		.insert(schema.childPhoto)
		.values({ childId, familyId: scope.familyId, data, version })
		.onConflictDoUpdate({ target: schema.childPhoto.childId, set: { data, version } })
		.run();
	return true;
}

/** False when the child is not in this family. */
export function removeChildPhoto(scope: FamilyScope, childId: number) {
	if (!scope.child(childId)) return false;
	scope.db.delete(schema.childPhoto).where(forChild(scope, childId)).run();
	return true;
}
