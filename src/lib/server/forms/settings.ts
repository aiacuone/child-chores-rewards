// Server checks for Settings. Bad input is refused, not fixed.
import { z } from 'zod';
import { isPin } from '../pin';
import { MESSAGES } from './setup';
import {
	AUTO_LOCK_MINUTES,
	AUTO_RETURN_SECONDS,
	BONUS_LIMITS,
	RESET_STEP,
	type Settings
} from '../../settings';

const oneOf = <T extends number>(values: readonly T[]) =>
	z.number().refine((n): n is T => values.includes(n as T));

const settingsInput = z
	.strictObject({
		autoLockMinutes: oneOf(AUTO_LOCK_MINUTES),
		autoReturnSeconds: oneOf(AUTO_RETURN_SECONDS),
		resetMinutes: z
			.number()
			.int()
			.min(0)
			.max(24 * 60 - RESET_STEP)
			.multipleOf(RESET_STEP),
		dailyBonus: z
			.number()
			.int()
			.min(BONUS_LIMITS.min)
			.max(BONUS_LIMITS.max)
			.multipleOf(BONUS_LIMITS.step),
		alertChores: z.boolean(),
		alertRewards: z.boolean()
	})
	.partial()
	.refine((v) => Object.keys(v).length > 0);

/** Read some settings from a JSON body. Null when anything in it is not allowed. */
export function parseSettings(body: unknown): Partial<Settings> | null {
	const parsed = settingsInput.safeParse(body);
	return parsed.success ? (parsed.data as Partial<Settings>) : null;
}

/** Read Change PIN. The current PIN is only checked for shape here. */
export function parsePinChange(body: unknown) {
	const b = (body ?? {}) as { current?: unknown; pin?: unknown; again?: unknown };
	if (!isPin(b.current) || !isPin(b.pin)) return { ok: false as const, message: MESSAGES.pinShape };
	if (b.pin !== b.again) return { ok: false as const, message: MESSAGES.pinMatch };
	return { ok: true as const, current: b.current, pin: b.pin };
}
