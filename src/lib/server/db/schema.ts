import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** A family owns everything else: children, chores, stars and rewards. */
export const family = sqliteTable('family', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type Family = typeof family.$inferSelect;
