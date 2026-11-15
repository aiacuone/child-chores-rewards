import { describe, expect, it } from 'vitest';
import { openDatabase, schema } from './index';

describe('database', () => {
	it('applies the migrations and stores a family', () => {
		const { db, sqlite } = openDatabase(':memory:');
		db.insert(schema.family).values({ name: 'Test family' }).run();
		const rows = db.select().from(schema.family).all();
		expect(rows).toHaveLength(1);
		expect(rows[0].name).toBe('Test family');
		sqlite.close();
	});
});
