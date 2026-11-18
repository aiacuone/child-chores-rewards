// The PIN asked for again inside grown-up mode (Change email, Change PIN). A
// refusal is the message to show; the first lock tells every grown-up.
import { ALERTS, sendSafetyAlert } from './alerts';
import type { FamilyScope } from './family';
import { checkPin } from './grownup';

const clock = (ms: number) => {
	const s = Math.ceil(ms / 1000);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Null when the PIN is right, otherwise what to tell the grown-up. */
export async function pinRefusal(scope: FamilyScope, pin: string, origin: string) {
	const result = checkPin(scope, pin);
	if (result.ok) return null;
	if (result.reason === 'wrong') return 'Wrong PIN, try again.';
	if (result.firstLock) await sendSafetyAlert(scope, ALERTS.pinLocked, origin);
	return `Too many tries. Try again in ${clock(result.until - Date.now())}.`;
}
