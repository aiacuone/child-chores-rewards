import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const createdAt = () =>
	integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date());

/** A family owns everything else: children, chores, stars and rewards. */
export const family = sqliteTable('family', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	createdAt: createdAt()
});

/** A grown-up who signs in with Google. The first one in a family is its owner. */
export const user = sqliteTable(
	'user',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		role: text('role', { enum: ['owner', 'grownup'] }).notNull(),
		email: text('email').notNull().unique(),
		googleSub: text('google_sub').notNull().unique(),
		name: text('name').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('user_family_idx').on(t.familyId)]
);

/** One signed-in device. The id is a hash of the cookie token, never the token itself. */
export const session = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
	},
	(t) => [index('session_user_idx').on(t.userId)]
);

export type Family = typeof family.$inferSelect;
export type User = typeof user.$inferSelect;
