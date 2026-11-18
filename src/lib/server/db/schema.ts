import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
	/** Wrong PINs in a row before the first lock (grownup.ts). */
	pinFails: integer('pin_fails').notNull().default(0),
	/** How many locks in this run of wrong PINs: 1 is 30 s, 2 is 1 min, 3 is 5 min, 4 is 15 min. */
	pinLockStage: integer('pin_lock_stage').notNull().default(0),
	/** The PIN pad is locked until this time. */
	pinLockedUntil: integer('pin_locked_until', { mode: 'timestamp_ms' }),
	/**
	 * Goes up by one whenever the family's children, chores, chore copies or
	 * stars change (database triggers, migration 0010). Screens poll it to know
	 * when to reload (ADR 0006, live.ts).
	 */
	version: integer('version').notNull().default(0),
	createdAt: createdAt()
});

/** An emailed code for setting a new PIN (pin-reset.ts). Rows are kept so sends can be counted. */
export const pinReset = sqliteTable(
	'pin_reset',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		/** The emailed 6-digit code as a salted scrypt hash (pin.ts). The code is never stored. */
		codeHash: text('code_hash').notNull(),
		wrongTries: integer('wrong_tries').notNull().default(0),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		/** When it set a new PIN. */
		usedAt: integer('used_at', { mode: 'timestamp_ms' }),
		/** When too many wrong tries or a newer code ended it. */
		cancelledAt: integer('cancelled_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => [index('pin_reset_family_idx').on(t.familyId, t.createdAt)]
);

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

/**
 * Grown-up mode on one device (ADR 0007). The token itself lives only in the
 * page's memory; this keeps its hash, tied to the device's session.
 */
export const grownupToken = sqliteTable(
	'grownup_token',
	{
		id: text('id').primaryKey(),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		sessionId: text('session_id')
			.notNull()
			.references(() => session.id, { onDelete: 'cascade' }),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
	},
	(t) => [index('grownup_token_session_idx').on(t.sessionId)]
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
 * A chore in the family's library (the Chores tab). It may have no children
 * assigned. Repeats come with #21; until then every chore is daily.
 */
export const chore = sqliteTable(
	'chore',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		/** One of CHORE_ICONS in src/lib/chore-icons.ts. */
		icon: text('icon', { enum: ['bed', 'paw', 'toys', 'book', 'plate', 'bin'] }).notNull(),
		stars: integer('stars').notNull(),
		/** What done looks like, shown to the child on the stop. Empty when not given. */
		expectations: text('expectations').notNull().default(''),
		/**
		 * When it is due (src/lib/repeat.ts). Only the columns its kind uses are
		 * filled: weekly `repeat_days`, monthly `repeat_day`, custom `repeat_every`,
		 * `repeat_unit` and `repeat_date` (the start), once `repeat_date`.
		 */
		repeatKind: text('repeat_kind', { enum: ['daily', 'weekly', 'monthly', 'custom', 'once'] })
			.notNull()
			.default('daily'),
		/** Weekly: one bit per day, Monday = 1 up to Sunday = 64. */
		repeatDays: integer('repeat_days'),
		/** Monthly: day of the month, 1 to 31. */
		repeatDay: integer('repeat_day'),
		repeatEvery: integer('repeat_every'),
		repeatUnit: text('repeat_unit', { enum: ['days', 'weeks'] }),
		/** A Melbourne date, 'YYYY-MM-DD'. */
		repeatDate: text('repeat_date'),
		/** Hidden from children's screens until a grown-up unhides it. Grown-ups still see it. */
		hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
		/**
		 * Skipped: the first chore day it is back, a Melbourne date. It ends by itself,
		 * so nothing has to run when the day comes (src/lib/skip.ts).
		 */
		skipUntil: text('skip_until'),
		/** Skipped until a grown-up turns it back on. */
		skipOpen: integer('skip_open', { mode: 'boolean' }).notNull().default(false),
		createdAt: createdAt()
	},
	(t) => [index('chore_family_idx').on(t.familyId)]
);

/**
 * A reward in the family's library (the Rewards tab, My rewards). It may have
 * no children assigned. Claims are in reward_claim.
 */
export const reward = sqliteTable(
	'reward',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		/** Stars needed. A child can claim it when their balance reaches this. */
		cost: integer('cost').notNull(),
		/** The planet's colour, one of PLANETS in src/lib/reward-planets.ts. */
		colour: text('colour', { enum: ['pink', 'purple', 'green', 'tan', 'blue'] })
			.notNull()
			.default('pink'),
		createdAt: createdAt()
	},
	(t) => [index('reward_family_idx').on(t.familyId)]
);

/**
 * Which children a reward is for ("Who does it?"). Each child it is for gets
 * a meter. Unassigning a child removes the row; stars are never touched.
 */
export const rewardChild = sqliteTable(
	'reward_child',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		rewardId: integer('reward_id')
			.notNull()
			.references(() => reward.id, { onDelete: 'cascade' }),
		childId: integer('child_id')
			.notNull()
			.references(() => child.id, { onDelete: 'cascade' })
	},
	(t) => [
		index('reward_child_family_idx').on(t.familyId),
		uniqueIndex('reward_child_reward_child_idx').on(t.rewardId, t.childId)
	]
);

/**
 * A child asking for a reward (docs/SPEC.md, "Rewards"). It waits for a grown-up,
 * who hands the reward out (the stars are taken then, as one star_event row of
 * kind 'reward') or declines it with a message. A child has at most one waiting
 * claim for each reward; the partial unique index makes a double tap harmless.
 */
export const rewardClaim = sqliteTable(
	'reward_claim',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		rewardId: integer('reward_id')
			.notNull()
			.references(() => reward.id, { onDelete: 'cascade' }),
		childId: integer('child_id')
			.notNull()
			.references(() => child.id, { onDelete: 'cascade' }),
		status: text('status', { enum: ['waiting', 'handed_out', 'declined'] })
			.notNull()
			.default('waiting'),
		/** Handed out: the stars taken, which is the reward's cost at that moment. */
		stars: integer('stars'),
		/** Declined: the grown-up's kind message. */
		message: text('message'),
		resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
		/** When the child saw the answer on My rewards. Null until then. */
		seenAt: integer('seen_at', { mode: 'timestamp_ms' }),
		createdAt: createdAt()
	},
	(t) => [
		index('reward_claim_family_idx').on(t.familyId, t.childId),
		uniqueIndex('reward_claim_waiting_idx')
			.on(t.rewardId, t.childId)
			.where(sql`${t.status} = 'waiting'`)
	]
);

/**
 * One row per family per chore day the daily reset ran (ADR 0010). The unique
 * index makes each day's reset run once, and the rows show a missed or late one.
 */
export const choreReset = sqliteTable(
	'chore_reset',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		/** The chore day it reset for, a Melbourne date 'YYYY-MM-DD'. */
		choreDay: text('chore_day').notNull(),
		ranAt: integer('ran_at', { mode: 'timestamp_ms' }).notNull(),
		/** How many copies went back to pending. */
		copiesReset: integer('copies_reset').notNull().default(0)
	},
	(t) => [uniqueIndex('chore_reset_family_day_idx').on(t.familyId, t.choreDay)]
);

/**
 * One child's copy of a chore, with its own status (docs/SPEC.md, "Chores").
 * Assigning a child adds a copy; unassigning removes it.
 */
export const choreCopy = sqliteTable(
	'chore_copy',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		choreId: integer('chore_id')
			.notNull()
			.references(() => chore.id, { onDelete: 'cascade' }),
		childId: integer('child_id')
			.notNull()
			.references(() => child.id, { onDelete: 'cascade' }),
		status: text('status', { enum: ['pending', 'waiting', 'completed', 'skipped'] })
			.notNull()
			.default('pending'),
		/** When the child tapped "I did it!". Undo is allowed for about a minute after it. */
		doneAt: integer('done_at', { mode: 'timestamp_ms' }),
		/** When a grown-up accepted it. The grown-up can undo for 1 minute after it. */
		checkedAt: integer('checked_at', { mode: 'timestamp_ms' }),
		/** The star row the accept added, so undo removes that row and no other. */
		starEventId: integer('star_event_id'),
		/** The grown-up's kind message when they sent it back. Shown on the trip until "I did it!". */
		message: text('message'),
		createdAt: createdAt()
	},
	(t) => [
		index('chore_copy_family_idx').on(t.familyId),
		uniqueIndex('chore_copy_chore_child_idx').on(t.choreId, t.childId)
	]
);

/**
 * "Feed Biscuit the dog checked! +15 stars" waiting to show on a child's trip.
 * Shown once: the trip deletes the row as it shows it. Kept out of chore_copy,
 * and given no version trigger, so showing it does not make every screen reload.
 */
export const checkedNotice = sqliteTable(
	'checked_notice',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		familyId: integer('family_id')
			.notNull()
			.references(() => family.id, { onDelete: 'cascade' }),
		childId: integer('child_id')
			.notNull()
			.references(() => child.id, { onDelete: 'cascade' }),
		copyId: integer('copy_id')
			.notNull()
			.references(() => choreCopy.id, { onDelete: 'cascade' }),
		stars: integer('stars').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('checked_notice_child_idx').on(t.familyId, t.childId)]
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
export type Chore = typeof chore.$inferSelect;
export type ChoreCopy = typeof choreCopy.$inferSelect;
export type EmailVerification = typeof emailVerification.$inferSelect;
