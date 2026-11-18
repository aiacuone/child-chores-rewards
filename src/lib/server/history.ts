// A child's star history for the grown-ups (docs/SPEC.md, "Star history"): the
// star rows that stand, grouped by day, newest first. Undo and "That wasn't Mia"
// delete or move rows (ADR 0003), so reading the rows is enough: nothing here
// keeps its own copy. Only the signed-in family's rows are read.
import { and, desc, eq, inArray } from 'drizzle-orm';
import { schema } from './db';
import type { FamilyScope } from './family';
import { melbourne, weekday, WEEKDAYS } from '../repeat';

/** The newest rows shown. A family would need years of chores to pass it. */
export const HISTORY_LIMIT = 500;

export type HistoryItem = {
	id: number;
	kind: 'chore' | 'bonus' | 'reward';
	/** Positive when earned, negative when a reward was handed out. */
	amount: number;
	/** "Tidy the toy box", "Daily bonus" or "Movie night handed out". */
	name: string;
	/** The Melbourne time, for example "9:14" or "18:05". */
	time: string;
};

export type HistoryDay = {
	/** The Melbourne date, 'YYYY-MM-DD'. */
	date: string;
	/** "Sun 15 Nov". */
	label: string;
	items: HistoryItem[];
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const dayLabel = (date: string) =>
	`${WEEKDAYS[weekday(date)].short} ${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;

const clock = (minutes: number) =>
	`${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

/** The names of the chores the rows came from, by chore copy id. */
function choreNames(scope: FamilyScope, copyIds: number[]) {
	if (!copyIds.length) return new Map<number, string>();
	return new Map(
		scope.db
			.select({ id: schema.choreCopy.id, name: schema.chore.name })
			.from(schema.choreCopy)
			.innerJoin(schema.chore, eq(schema.chore.id, schema.choreCopy.choreId))
			.where(
				and(
					scope.where(schema.choreCopy, inArray(schema.choreCopy.id, copyIds)),
					eq(schema.chore.familyId, scope.familyId)
				)
			)
			.all()
			.map((r) => [r.id, r.name])
	);
}

/** The names of the rewards handed out, by claim id. */
function rewardNames(scope: FamilyScope, claimIds: number[]) {
	if (!claimIds.length) return new Map<number, string>();
	return new Map(
		scope.db
			.select({ id: schema.rewardClaim.id, name: schema.reward.name })
			.from(schema.rewardClaim)
			.innerJoin(schema.reward, eq(schema.reward.id, schema.rewardClaim.rewardId))
			.where(
				and(
					scope.where(schema.rewardClaim, inArray(schema.rewardClaim.id, claimIds)),
					eq(schema.reward.familyId, scope.familyId)
				)
			)
			.all()
			.map((r) => [r.id, r.name])
	);
}

/**
 * The child's star changes grouped by Melbourne day, newest first. Throws
 * `NotInFamily` for a child that is not in this family.
 */
export function starHistory(scope: FamilyScope, childId: number): HistoryDay[] {
	scope.requireChild(childId);
	const rows = scope.db
		.select()
		.from(schema.starEvent)
		.where(scope.where(schema.starEvent, eq(schema.starEvent.childId, childId)))
		.orderBy(desc(schema.starEvent.createdAt), desc(schema.starEvent.id))
		.limit(HISTORY_LIMIT)
		.all();
	const sourceIds = (kind: string) =>
		rows.flatMap((r) => (r.kind === kind && r.sourceId !== null ? [r.sourceId] : []));
	const chores = choreNames(scope, sourceIds('chore'));
	const rewards = rewardNames(scope, sourceIds('reward'));

	const days: HistoryDay[] = [];
	for (const r of rows) {
		const { date, minutes } = melbourne(r.createdAt);
		const name =
			r.kind === 'bonus'
				? 'Daily bonus'
				: r.kind === 'chore'
					? (chores.get(r.sourceId ?? 0) ?? 'A removed chore')
					: `${rewards.get(r.sourceId ?? 0) ?? 'A removed reward'} handed out`;
		let day = days.at(-1);
		if (day?.date !== date) days.push((day = { date, label: dayLabel(date), items: [] }));
		day.items.push({ id: r.id, kind: r.kind, amount: r.amount, name, time: clock(minutes) });
	}
	return days;
}
