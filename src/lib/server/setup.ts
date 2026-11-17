// Grown-up setup (docs/SPEC.md, "Devices and sign-in"): 1 children, 2 PIN,
// 3 recovery email, 4 alerts, then Setup-Done.
// - Steps 1 and 2 lock once the PIN is set, so setup can never replace the PIN
//   or the children; Settings (with the PIN) takes over.
// - Steps 3 and 4 stay open until Finish, then every setup page refuses.
import { and, eq, isNull } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { hashPin } from './pin';
import type { ChildInput } from './forms/setup';
import { linkSent } from './recovery-email';

export type SetupStep = 'children' | 'pin' | 'email' | 'alerts' | 'done';

export class SetupClosed extends Error {
	constructor() {
		super('setup is finished for this family');
	}
}

function familyRow(db: Pick<FamilyScope['db'], 'select'>, familyId: number) {
	const [row] = db
		.select({ pinHash: schema.family.pinHash, setupDoneAt: schema.family.setupDoneAt })
		.from(schema.family)
		.where(eq(schema.family.id, familyId))
		.all();
	return row;
}

const pinIsSet = (db: Pick<FamilyScope['db'], 'select'>, familyId: number) =>
	familyRow(db, familyId)?.pinHash != null;

/** The setup step this family is on. */
export function setupStep(scope: FamilyScope): SetupStep {
	const row = familyRow(scope.db, scope.familyId);
	if (row?.setupDoneAt) return 'done';
	if (row?.pinHash != null) return linkSent(scope) ? 'alerts' : 'email';
	return scope.children().length === 0 ? 'children' : 'pin';
}

/** The setup pages a family may open on each step. Anything else sends them to their step. */
export const OPEN_PAGES: Record<SetupStep, SetupStep[]> = {
	children: ['children'],
	pin: ['children', 'pin'],
	email: ['email'],
	alerts: ['email', 'alerts'],
	done: []
};

/** Finish setup (the Finish button on step 4). */
export function finishSetup(scope: FamilyScope, now = new Date()) {
	if (setupStep(scope) !== 'alerts') throw new SetupClosed();
	scope.db
		.update(schema.family)
		.set({ setupDoneAt: now })
		.where(eq(schema.family.id, scope.familyId))
		.run();
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
