import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** The PIN of the family that /test/sign-in sets up. */
export const TEST_PIN = '1234';

/**
 * Sign in without Google. Works only on the test server.
 * - no options: the shared test grown-up, whose family has finished setup,
 * - `as`: a separate grown-up with their own family,
 * - `newFamily`: leave that family's setup unfinished.
 */
export async function signIn(page: Page, opts: { as?: string; newFamily?: boolean } = {}) {
	const q = new URLSearchParams();
	if (opts.as) q.set('as', opts.as);
	if (opts.newFamily) q.set('setup', 'new');
	await page.goto(`/test/sign-in?${q}`);
}

/** Fail on any accessibility problem axe finds on the page as it is now. */
export async function expectAccessible(page: Page) {
	const { violations } = await new AxeBuilder({ page }).analyze();
	expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

export const BASE = 'http://localhost:4173';
const JSON_POST = { origin: BASE, 'content-type': 'application/json' };

/** Add chores through the grown-up API, as a grown-up would on the Chores tab. */
export async function addChores(
	page: Page,
	chores: { name: string; expectations?: string; repeat?: object }[]
) {
	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const headers = { ...JSON_POST, 'x-grown-up': token };
	const { children } = await (await page.request.get('/api/grown-up/chores', { headers })).json();
	const mia = children.find((c: { name: string }) => c.name === 'Mia').id as number;
	const ids: Record<string, number> = {};
	for (const c of chores) {
		const res = await page.request.post('/api/grown-up/chores', {
			headers,
			data: {
				name: c.name,
				expectations: c.expectations ?? '',
				icon: 'toys',
				stars: 10,
				childIds: [mia],
				repeat: c.repeat ?? { kind: 'daily' }
			}
		});
		expect(res.status()).toBe(201);
		ids[c.name] = (await res.json()).id;
	}
	await page.request.post('/api/grown-up/lock', { headers });
	return { mia, ids };
}

/** Type the grown-up PIN on the pad. */
export async function typePin(page: Page, pin = TEST_PIN) {
	for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
}

/**
 * Mia sends a stop with "I did it!" and a grown-up accepts it through the API.
 * `as` is the test user, `token` a grown-up token from /api/grown-up/unlock.
 * Returns the chore copy's id, for undoing the accept.
 */
export async function acceptStop(
	page: Page,
	as: string,
	childId: number,
	choreId: number,
	token: string
) {
	await page.goto(`/trip/${childId}/stop/${choreId}/confirm`);
	await page.getByRole('button', { name: /^Yes, I’m / }).click();
	await expect(page.getByRole('status')).toBeVisible();
	const { alerts } = (await (await page.request.get(`/test/outbox?as=${as}`)).json()) as {
		alerts: { headers: Record<string, string> }[];
	};
	const copy = alerts.at(-1)!.headers.Click.split('/').pop()!;
	const res = await page.request.post(`/api/grown-up/checks/${copy}`, {
		headers: { origin: BASE, 'content-type': 'application/json', 'x-grown-up': token },
		data: { action: 'accept' }
	});
	expect(res.status()).toBe(204);
	return copy;
}
