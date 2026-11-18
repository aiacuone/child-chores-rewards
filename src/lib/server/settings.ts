// The family's settings (docs/SPEC.md, "Settings"). They live on the family row
// and every read goes through the family scope.
import { eq, sql } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { choreDay } from '../repeat';
import { DEFAULT_SETTINGS, type Settings } from '../settings';

export function getSettings(scope: FamilyScope): Settings {
	const [row] = scope.db
		.select({
			autoLockMinutes: schema.family.autoLockMinutes,
			autoReturnSeconds: schema.family.autoReturnSeconds,
			resetMinutes: schema.family.resetMinutes,
			dailyBonus: schema.family.dailyBonus,
			alertChores: schema.family.alertChores,
			alertRewards: schema.family.alertRewards
		})
		.from(schema.family)
		.where(eq(schema.family.id, scope.familyId))
		.all();
	return row ? (row as Settings) : DEFAULT_SETTINGS;
}

/** Change some settings. The version goes up so children's screens pick them up. */
export function updateSettings(scope: FamilyScope, changes: Partial<Settings>) {
	scope.db
		.update(schema.family)
		.set({ ...changes, version: sql`${schema.family.version} + 1` })
		.where(eq(schema.family.id, scope.familyId))
		.run();
	return getSettings(scope);
}

/** The family's chore day: before its reset time it is still the day before. */
export const familyDay = (scope: FamilyScope, now = new Date()) =>
	choreDay(now, getSettings(scope).resetMinutes);
