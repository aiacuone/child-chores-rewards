// Ranks from the current star balance (docs/SPEC.md "Trip, stars and bonus").
// Shared by the server and the Rocket component, so it has no server imports.

export const RANKS = [
	{ name: 'Cadet', min: 0, perk: 'Plain rocket' },
	{ name: 'Pilot', min: 50, perk: 'Wing and hull stripes' },
	{ name: 'Explorer', min: 100, perk: 'Side boosters' },
	{ name: 'Captain', min: 250, perk: 'Gold collar and wing tips' },
	{ name: 'Commander', min: 500, perk: 'Gold star and glow' }
] as const;

export type RankName = (typeof RANKS)[number]['name'];

/** The rank for a balance, and the next rank with the stars still needed (null at the top). */
export function rankFor(stars: number) {
	const s = Math.max(0, Math.floor(stars));
	let i = 0;
	while (i + 1 < RANKS.length && s >= RANKS[i + 1].min) i++;
	const next = RANKS[i + 1];
	return {
		rank: RANKS[i].name as RankName,
		next: next ? { rank: next.name as RankName, starsNeeded: next.min - s } : null
	};
}
