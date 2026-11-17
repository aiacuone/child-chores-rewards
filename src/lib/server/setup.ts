// Grown-up setup (docs/SPEC.md, "Devices and sign-in"): add children, then the
// PIN. Setup stays open only until the PIN is set. After that the setup pages
// refuse, so nobody on a signed-in tablet can use them to replace the PIN or
// the children; Settings (with the PIN) takes over.
import { and, eq, isNull } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { hashPin } from './pin';
import type { ChildInput } from './forms/setup';

export type SetupStep = 'children' | 'pin' | 'done';

export class SetupClosed extends Error {
	constructor() {
		super('setup is finished for this family');
	}
}

function pinIsSet(db: Pick<FamilyScope['db'], 'select'>, familyId: number) {
	const [row] = db
		.select({ pinHash: schema.family.pinHash })
		.from(schema.family)
		.where(eq(schema.family.id, familyId))
		.all();
	return row?.pinHash != null;
}

/** The setup step this family is on. Steps 3 and 4 come with #17. */
export function setupStep(scope: FamilyScope): SetupStep {
	if (pinIsSet(scope.db, scope.familyId)) return 'done';
	return scope.children().length === 0 ? 'children' : 'pin';
}

/** Replace the family's children with these. Only while setup is open. */
export function saveChildren(scope: FamilyScope, rows: ChildInput[]) {
	scope.db.transaction((tx) => {
		if (pinIsSet(tx, scope.familyId)) throw new SetupClosed();
		tx.delete(schema.child).where(scope.where(schema.child)).run();
		for (const r of rows)
			tx.insert(schema.child)
				.values({ familyId: scope.familyId, name: r.name, colour: r.colour })
				.run();
	});
}

/** Set the family PIN. Refuses if a PIN is already set, even from a second tab. */
export function setFirstPin(scope: FamilyScope, pin: string) {
	if (scope.children().length === 0) throw new Error('add children first');
	const changed = scope.db
		.update(schema.family)
		.set({ pinHash: hashPin(pin) })
		.where(and(eq(schema.family.id, scope.familyId), isNull(schema.family.pinHash)))
		.run().changes;
	if (changed !== 1) throw new SetupClosed();
}
