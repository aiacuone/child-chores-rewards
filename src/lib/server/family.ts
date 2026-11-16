// Every read and write of family data goes through a scope made from the
// signed-in grown-up's family, so one family can never reach another's rows.
import { and, eq, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { schema, type Db } from './db';

export class NotInFamily extends Error {
	constructor(what: string) {
		super(`${what} is not in this family`);
	}
}

export type FamilyScope = ReturnType<typeof forFamily>;

/** A view of the database limited to one family. Build it from `locals.user.familyId`. */
export function forFamily(db: Db, familyId: number) {
	if (!Number.isSafeInteger(familyId) || familyId <= 0) throw new Error('invalid family id');

	/** The filter for this family on any table with a family_id column, plus any extra conditions. */
	const where = (table: { familyId: SQLiteColumn }, ...more: (SQL | undefined)[]) =>
		and(eq(table.familyId, familyId), ...more);

	return {
		db,
		familyId,
		where,

		children() {
			return db.select().from(schema.child).where(where(schema.child)).orderBy(schema.child.id).all();
		},

		/** The child, or null if it does not exist or belongs to another family. */
		child(childId: number) {
			const [row] = db
				.select()
				.from(schema.child)
				.where(where(schema.child, eq(schema.child.id, childId)))
				.all();
			return row ?? null;
		},

		/** Like `child`, but throws when the child is not in this family. */
		requireChild(childId: number) {
			const row = this.child(childId);
			if (!row) throw new NotInFamily('child');
			return row;
		},

		addChild(name: string) {
			const [row] = db.insert(schema.child).values({ familyId, name }).returning().all();
			return row;
		}
	};
}
