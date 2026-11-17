import { expect, test, type Page } from '@playwright/test';
import { TEST_PIN, expectAccessible, signIn } from './helpers';

// Requests from the app's own pages carry its origin; SvelteKit refuses posts without it.
const ORIGIN = { origin: 'http://localhost:4173' };

// Grown-up mode and the wrong-PIN lockout (#19).

async function typePin(page: Page, pin: string) {
	for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
}

async function openGrownUp(page: Page) {
	await page.getByRole('link', { name: 'I’m a grown-up' }).click();
	await expect(page.getByRole('heading', { name: 'Grown-up PIN' })).toBeVisible();
}

test('the right PIN opens grown-up mode, which a refresh locks', async ({ page }) => {
	await signIn(page);
	await openGrownUp(page);
	await expectAccessible(page);
	await typePin(page, TEST_PIN);
	await expect(page.getByRole('heading', { name: 'Mission control' })).toBeVisible();
	await expect(page.getByText(/Grown-up mode · locks in [12]:\d\d/)).toBeVisible();
	await expectAccessible(page);

	// Moving between grown-up pages keeps it open.
	await page.getByRole('link', { name: 'Chores' }).click();
	await expect(page.getByRole('heading', { name: 'Chores' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Chores' })).toHaveAttribute('aria-current', 'page');

	// The token is only in page memory: a refresh asks again.
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Grown-up PIN' })).toBeVisible();
});

test('Lock goes back to Who’s flying, locked', async ({ page }) => {
	await signIn(page);
	await openGrownUp(page);
	await typePin(page, TEST_PIN);
	await page.getByRole('button', { name: 'Lock', exact: true }).click();
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('status')).toHaveText('Grown-up mode is locked');
	await openGrownUp(page);
});

test('leaving the grown-up pages locks grown-up mode', async ({ page }) => {
	await signIn(page);
	await openGrownUp(page);
	await typePin(page, TEST_PIN);
	await expect(page.getByRole('heading', { name: 'Mission control' })).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL('/');
	await openGrownUp(page);
});

test('no touches for 2 minutes locks it, with 10 seconds of warning', async ({ page }) => {
	await page.clock.install();
	await signIn(page);
	await openGrownUp(page);
	await typePin(page, TEST_PIN);
	await expect(page.getByRole('heading', { name: 'Mission control' })).toBeVisible();

	await page.clock.runFor(109_000);
	await expect(page.getByRole('alertdialog')).toHaveCount(0);
	await page.clock.runFor(2_000);
	const dialog = page.getByRole('alertdialog', { name: 'Locking soon' });
	await expect(dialog).toBeVisible();
	await expect(page.getByRole('button', { name: 'Keep going' })).toBeFocused();
	await expectAccessible(page);

	await page.getByRole('button', { name: 'Keep going' }).click();
	await expect(dialog).toHaveCount(0);

	await page.clock.runFor(121_000);
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('status')).toHaveText('Grown-up mode is locked');
});

test('wrong PINs, then the pad locks for every device of the family', async ({ page, browser }) => {
	await signIn(page, { as: 'lockout' });
	await openGrownUp(page);
	for (let i = 1; i <= 4; i++) {
		await typePin(page, '0000');
		await expect(page.getByRole('alert')).toHaveText(/Wrong PIN, try again\./);
	}
	await expectAccessible(page);
	await typePin(page, '0000');
	await expect(page.getByRole('heading', { name: 'Too many tries' })).toBeVisible();
	await expect(page.getByRole('timer')).toHaveText(/0:(30|29|28)/);
	await expect(page.getByRole('button', { name: '1', exact: true })).toBeDisabled();
	await expect(page.getByRole('link', { name: 'Forgot PIN?' })).toBeVisible();
	await expectAccessible(page);

	// Every grown-up got one alert, with no names or details.
	const { alerts } = await (await page.request.get('/test/outbox')).json();
	const locked = alerts.filter(
		(a: { headers: Record<string, string> }) => a.headers.Title === 'PIN pad locked'
	);
	expect(locked.length).toBeGreaterThanOrEqual(1);
	expect(locked.at(-1).body).toBe(
		'Too many wrong PIN tries. The PIN pad is locked for 30 seconds.'
	);
	expect(locked.at(-1).headers.Click).toBe('http://localhost:4173/grown-up');

	// Another device of the same family sees the lock too, and even the right PIN is refused.
	const other = await (await browser.newContext({ baseURL: 'http://localhost:4173' })).newPage();
	await signIn(other, { as: 'lockout' });
	await other.goto('/grown-up');
	await expect(other.getByRole('heading', { name: 'Too many tries' })).toBeVisible();
	const res = await other.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } });
	expect((await res.json()).result).toBe('locked');
	await other.context().close();
});

test('the grown-up API refuses without a working token', async ({ page }) => {
	await signIn(page);
	for (const token of [undefined, 'made-up', 'a'.repeat(43)]) {
		const res = await page.request.post('/api/grown-up/touch', {
			headers: token ? { ...ORIGIN, 'x-grown-up': token } : ORIGIN
		});
		expect(res.status(), String(token)).toBe(401);
	}
	const bad = await page.request.post('/api/grown-up/unlock', { data: { pin: '12' } });
	expect(bad.status()).toBe(400);
});

test('a token from one family does not work for another', async ({ page, browser }) => {
	await signIn(page, { as: 'token-a' });
	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	expect(token).toBeTruthy();
	expect(
		(await page.request.post('/api/grown-up/touch', { headers: { ...ORIGIN, 'x-grown-up': token } })).status()
	).toBe(204);

	const other = await (await browser.newContext({ baseURL: 'http://localhost:4173' })).newPage();
	await signIn(other, { as: 'token-b' });
	const res = await other.request.post('/api/grown-up/touch', { headers: { ...ORIGIN, 'x-grown-up': token } });
	expect(res.status()).toBe(401);
	await other.context().close();
});
