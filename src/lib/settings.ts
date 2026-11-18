// What Settings can change (docs/SPEC.md, "Settings"), with the words for each
// choice. Shared by the server's checks and the pages.
import { RESET_MINUTES } from './repeat';
import { DAILY_BONUS } from './bonus';

export const AUTO_LOCK_MINUTES = [1, 2, 5] as const;
export const AUTO_RETURN_SECONDS = [30, 60, 120] as const;
export const RESET_STEP = 30;
export const BONUS_LIMITS = { min: 5, max: 100, step: 5 } as const;

export type Settings = {
	autoLockMinutes: (typeof AUTO_LOCK_MINUTES)[number];
	autoReturnSeconds: (typeof AUTO_RETURN_SECONDS)[number];
	/** The daily reset, in minutes after midnight, Melbourne time. */
	resetMinutes: number;
	dailyBonus: number;
	alertChores: boolean;
	alertRewards: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
	autoLockMinutes: 2,
	autoReturnSeconds: 60,
	resetMinutes: RESET_MINUTES,
	dailyBonus: DAILY_BONUS,
	alertChores: true,
	alertRewards: true
};

export const minutesLabel = (n: number) => `${n} minute${n === 1 ? '' : 's'}`;
export const returnLabel = (seconds: number) =>
	seconds < 60 ? `${seconds} seconds` : minutesLabel(seconds / 60);

/** "6:00 am". */
export function timeLabel(minutes: number) {
	const h = Math.floor(minutes / 60);
	const m = String(minutes % 60).padStart(2, '0');
	return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}
