import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { openDatabase, schema } from './db';
import { forFamily, type FamilyScope } from './family';
import { SetupClosed, saveChildren, setFirstPin, setupStep } from './setup';
import { verifyPin } from './pin';

let opened: ReturnType<typeof openDatabase>;
let ours: FamilyScope;
let theirs: FamilyScope;

beforeEach(() => {
	opened = openDatabase(':memory:');
	const { db } = opened;
	const [a, b] = db
		.insert(schema.family)
		.values([{ name: 'Ours' }, { name: 'Theirs' }])
		.returning()
		.all();
	ours = forFamily(db, a.id);
	theirs = forFamily(db, b.id);
});
afterEach(() => opened.sqlite.close());

const pinHashOf = (scope: FamilyScope) =>
	opened.db.select().from(schema.family).where(eq(schema.family.id, scope.familyId)).all()[0]
		.pinHash;

describe('setup', () => {
	it('goes children, then PIN, then done', () => {
		expect(setupStep(ours)).toBe('children');
		saveChildren(ours, [{ name: 'Mia', colour: 'pink' }]);
		expect(setupStep(ours)).toBe('pin');
		setFirstPin(ours, '4826');
		expect(setupStep(ours)).toBe('done');
	});

	it('replaces the children when step 1 is saved again', () => {
		saveChildren(ours, [{ name: 'Mia', colour: 'pink' }]);
		saveChildren(ours, [
			{ name: 'Mia', colour: 'purple' },
			{ name: 'Leo', colour: 'blue' }
		]);
		expect(ours.children().map((c) => [c.name, c.colour])).toEqual([
			['Mia', 'purple'],
			['Leo', 'blue']
		]);
	});

	it("never touches another family's children or PIN", () => {
		theirs.addChild('Sam', 'green');
		saveChildren(ours, [{ name: 'Mia', colour: 'pink' }]);
		setFirstPin(ours, '4826');
		expect(theirs.children().map((c) => c.name)).toEqual(['Sam']);
		expect(pinHashOf(theirs)).toBeNull();
		expect(setupStep(theirs)).toBe('pin');
	});

	it('stores only a hash of the PIN', () => {
		saveChildren(ours, [{ name: 'Mia', colour: 'pink' }]);
		setFirstPin(ours, '4826');
		const stored = pinHashOf(ours)!;
		expect(stored).not.toContain('4826');
		expect(verifyPin('4826', stored)).toBe(true);
		expect(verifyPin('4827', stored)).toBe(false);
	});

	it('closes once the PIN is set, so setup cannot replace the PIN or the children', () => {
		saveChildren(ours, [{ name: 'Mia', colour: 'pink' }]);
		setFirstPin(ours, '4826');
		const stored = pinHashOf(ours);
		expect(() => setFirstPin(ours, '0000')).toThrow(SetupClosed);
		expect(() => saveChildren(ours, [{ name: 'Zed', colour: 'blue' }])).toThrow(SetupClosed);
		expect(pinHashOf(ours)).toBe(stored);
		expect(ours.children().map((c) => c.name)).toEqual(['Mia']);
	});

	it('needs children before the PIN', () => {
		expect(() => setFirstPin(ours, '4826')).toThrow();
		expect(pinHashOf(ours)).toBeNull();
	});
});
