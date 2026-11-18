// Wording shared by the claim pages and the server (docs/SPEC.md, "Rewards";
// Claim-Decline.dc.html). The decline limit is the same as a sent-back chore's.
export { MAX_MESSAGE } from './check';

/** The kind messages a grown-up can pick when declining a claim. */
export const DECLINE_MESSAGES = [
	'Maybe on the weekend!',
	'Finish your chores first',
	'Ask me again tomorrow'
] as const;
