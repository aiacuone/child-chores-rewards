// Grown-up mode in the page (ADR 0007). The grown-up token lives only in this
// module's memory: never in a cookie, local storage or session storage. A
// refresh, a closed app or a new tab therefore asks for the PIN again.
// Only the browser changes this state; grown-up pages are not rendered on the
// server (src/routes/grown-up/+layout.ts).
import { goto } from '$app/navigation';

const GROWNUP_HEADER = 'x-grown-up';
/** Touches are reported to the server at most this often. */
const REPORT_EVERY = 30 * 1000;

const state = $state({ token: null as string | null, lastTouch: 0, justLocked: false });
let lastReport = 0;

export const grownup = {
	get token() {
		return state.token;
	},
	/** When the screen was last touched in grown-up mode. */
	get lastTouch() {
		return state.lastTouch;
	},
	/** True right after grown-up mode locked, for "Grown-up mode is locked" on Who's flying. */
	get justLocked() {
		return state.justLocked;
	},
	clearJustLocked() {
		state.justLocked = false;
	}
};

export type UnlockAnswer =
	{ result: 'ok' } | { result: 'wrong' } | { result: 'locked'; until: number };

/** Send a PIN from the pad. On the right PIN, grown-up mode starts. */
export async function unlockWithPin(pin: string): Promise<UnlockAnswer> {
	const res = await fetch('/api/grown-up/unlock', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ pin })
	});
	if (!res.ok) throw new Error(`unlock failed: ${res.status}`);
	const answer = (await res.json()) as UnlockAnswer & { token?: string };
	if (answer.result === 'ok' && answer.token) {
		state.token = answer.token;
		state.lastTouch = lastReport = Date.now();
		state.justLocked = false;
		return { result: 'ok' };
	}
	return answer;
}

/** When the pad unlocks again, or null when it is not locked. */
export async function padLockedUntil(): Promise<number | null> {
	const res = await fetch('/api/grown-up/pad');
	return res.ok ? ((await res.json()) as { lockedUntil: number | null }).lockedUntil : null;
}

/** A fetch for grown-up API routes: adds the token, and locks if the server refuses it. */
export async function grownupFetch(url: string, init: RequestInit = {}) {
	if (!state.token) throw new Error('grown-up mode is locked');
	const headers = new Headers(init.headers);
	headers.set(GROWNUP_HEADER, state.token);
	const res = await fetch(url, { ...init, headers });
	if (res.status === 401) lock();
	return res;
}

/** The screen was touched. `report` tells the server now, as "Keep going" does. */
export function touch(report = false) {
	if (!state.token) return;
	const now = Date.now();
	state.lastTouch = now;
	if (report || now - lastReport >= REPORT_EVERY) {
		lastReport = now;
		grownupFetch('/api/grown-up/touch', { method: 'POST' }).catch(() => {});
	}
}

/**
 * Lock grown-up mode: forget the token and end it on the server.
 * `toWhosFlying` goes back to Who's flying with "Grown-up mode is locked".
 */
export function lock({ toWhosFlying = true } = {}) {
	const token = state.token;
	state.token = null;
	if (token)
		fetch('/api/grown-up/lock', {
			method: 'POST',
			headers: { [GROWNUP_HEADER]: token },
			keepalive: true
		}).catch(() => {});
	if (toWhosFlying) {
		state.justLocked = !!token;
		goto('/');
	}
}
