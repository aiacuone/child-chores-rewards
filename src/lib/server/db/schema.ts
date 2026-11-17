import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const createdAt = () =>
	integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date());

// How these tables fit together: docs/how-it-works/database.md

/** A family owns everything else: children, chores, stars and rewards. */
export const family = sqliteTable('family', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	/** The shared grown-up PIN as a salted scrypt hash (pin.ts). Null until setup sets it. */
	pinHash: text('pin_hash'),
	/** Where PIN reset codes go. Set only once its confirm link is opened. */
	recoveryEmail: text('recovery_email'),
	/** The family's secret ntfy topic (alerts.ts). Shown only to grown-ups. */
	ntfyTopic: text('ntfy_topic'),
	/** When setup step 4 was finished. Null while setup is open. */
	setupDoneAt: integer('setup_done_at', { mode: 'timestamp' }),
	createdAt: createdAt()
});

/**
 * A confirm link sent to a new recovery email. The token is in the link only;
 * this keeps its hash. Rows are kept after use so sends can be counted.
 */
export const emailVerification = sqliteTable(
	'email_verification',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		tokenHash: text('token_hash').notNull().unique(),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		/** When it was confirmed, or cancelled by a newer link. */
		usedAt: integer('used_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [index('email_verification_family_idx').on(t.familyId, t.createdAt)]
);

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

/** A child in the family. Settings adds the rest later (photo, passcode). */
export const child = sqliteTable(
	'child',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		/** Their rocket colour, one of COLOURS in src/lib/colours.ts. */
		colour: text('colour', { enum: ['pink', 'blue', 'purple', 'green'] })
			.notNull()
			.default('pink'),
		createdAt: createdAt()
	},
	(t) => [index('child_family_idx').on(t.familyId)]
);

/**
 * Every change to a child's stars is one row (ADR 0003). The balance is the sum
 * of the rows; nothing else changes it. Undo deletes rows, and "That wasn't Mia"
 * moves them, so the log shows only what stands.
 */
export const starEvent = sqliteTable(
	'star_event',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		childId: integer('child_id')
			.notNull()
			.references(() => child.id, { onDelete: 'cascade' }),
		kind: text('kind', { enum: ['chore', 'bonus', 'reward'] }).notNull(),
		/** Stars at the time: positive for chores and bonuses, negative for rewards. */
		amount: integer('amount').notNull(),
		/** The chore copy or reward claim this came from, so undo can find its rows. */
		sourceId: integer('source_id'),
		createdAt: createdAt()
	},
	(t) => [
		index('star_event_child_idx').on(t.familyId, t.childId),
		index('star_event_source_idx').on(t.kind, t.sourceId)
	]
);

export type Family = typeof family.$inferSelect;
export type User = typeof user.$inferSelect;
export type Child = typeof child.$inferSelect;
export type StarEvent = typeof starEvent.$inferSelect;
export type EmailVerification = typeof emailVerification.$inferSelect;
