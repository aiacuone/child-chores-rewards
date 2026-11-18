// Server checks for a reward (Add-Reward.dc.html). Bad input is refused, not fixed.
import { z } from 'zod';
import { MAX_REWARD_NAME, REWARD_COST } from '../../rewards';
import { PLANET_IDS } from '../../reward-planets';
import { NAME } from './chores';

const rewardInput = z.object({
	name: z.string().max(MAX_REWARD_NAME).regex(NAME),
	cost: z.number().int().min(REWARD_COST.min).max(REWARD_COST.max),
	colour: z.enum(PLANET_IDS),
	childIds: z
		.array(z.number().int().positive())
		.max(4)
		.refine((ids) => new Set(ids).size === ids.length)
});

export type RewardInput = z.infer<typeof rewardInput>;

/** Read a reward from a JSON body. Null when it is not a valid reward. */
export function parseReward(body: unknown): RewardInput | null {
	const parsed = rewardInput.safeParse(body);
	return parsed.success ? parsed.data : null;
}
