// Live updates between devices (ADR 0006): screens poll the family's version
// and reload when it has gone up. Database triggers (migration 0010) bump it on
// every change to the family's children, chores, chore copies and stars.
import { eq } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';

/** The family's current version. One small read, so polling stays cheap. */
export function familyVersion(scope: FamilyScope) {
	const [row] = scope.db
		.select({ version: schema.family.version })
		.from(schema.family)
		.where(eq(schema.family.id, scope.familyId))
		.all();
	return row?.version ?? 0;
}
