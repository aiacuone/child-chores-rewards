// Wording and limits shared by the grown-up check pages and the server
// (docs/SPEC.md, "Checking, undo and send back"; Not-Done.dc.html).
import { melbourne } from './repeat';

/** The kind messages a grown-up can pick when sending a chore back. */
export const SEND_BACK_MESSAGES = [
	'Almost! Give it another go',
	'Please finish it properly',
	'Check the instructions and try again'
] as const;

/** "Write my own message…" is up to this long. */
export const MAX_MESSAGE = 100;

/** A grown-up can undo an accepted chore for this long. */
export const UNDO_CHECK_SECONDS = 60;

/** "6:12 pm", Melbourne time. */
export function timeOfDay(at: Date) {
	const { minutes } = melbourne(at);
	const hour = Math.floor(minutes / 60) % 24;
	const h = hour % 12 || 12;
	return `${h}:${String(minutes % 60).padStart(2, '0')} ${hour < 12 ? 'am' : 'pm'}`;
}

/** The message as the child reads it, ending with a full stop: “Almost! Give it another go.” */
export const asSaid = (message: string) => (/[.!?]$/.test(message) ? message : `${message}.`);

/** "0:52" */
export const clock = (seconds: number) =>
	`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
