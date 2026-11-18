// Types and rules shared by the reward pages and the server (docs/SPEC.md,
// "Rewards"; Rewards.dc.html, Child-Rewards.dc.html).
import type { PlanetId } from './reward-planets';

export const MAX_REWARD_NAME = 40;
/** Stars needed: a whole number in this range (decided in #26). */
export const REWARD_COST = { min: 1, max: 1000, start: 100 } as const;

/** A child's progress towards a reward: the meter and its words. */
export function meter(stars: number, cost: number) {
	const ready = stars >= cost;
	return {
		ready,
		/** 0 to 100, for the width of the bar. */
		percent: Math.min(100, Math.round((Math.max(stars, 0) / cost) * 100)),
		toGo: ready ? 0 : cost - stars
	};
}

export type RewardChild = { id: number; name: string; colour: string; stars: number };

/** One reward on the grown-up's Rewards tab, with a meter for each child it is for. */
export type RewardSummary = {
	id: number;
	name: string;
	cost: number;
	colour: PlanetId;
	photo: string | null;
	children: RewardChild[];
	/** The first claim waiting for a grown-up, if any: tapping the reward opens its hand-out. */
	waiting: { claimId: number } | null;
};

/** What the reward form sends. */
export type RewardFields = {
	name: string;
	cost: number;
	colour: PlanetId;
	childIds: number[];
};

/** One reward on a child's My rewards screen. */
export type ChildReward = {
	id: number;
	name: string;
	cost: number;
	colour: PlanetId;
	photo: string | null;
	stars: number;
	/** The child has asked for it and a grown-up has not answered yet. */
	asked: boolean;
};
