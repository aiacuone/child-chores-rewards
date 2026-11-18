import { expect, test, type Page } from '@playwright/test';
import { BASE, TEST_PIN, addChores, expectAccessible, signIn, typePin } from './helpers';

// The Settings rows (#31): each one saves and takes effect.

const NEW_PIN = '5678';
type Alert = { headers: Record<string, string> };

const alerts = async (page: Page, as: string, title: string) =>
	(
		(await (await page.request.get(`/test/outbox?as=${as}`)).json()) as { alerts: Alert[] }
	).alerts.filter((a) => a.headers.Title === title);

const row = (page: Page, name: string | RegExp) => page.getByRole('link', { name });
const back = (page: Page) => page.getByRole('link', { name: 'Back', exact: true }).click();

async function openSettings(page: Page) {
	await page.goto('/grown-up/settings');
	await typePin(page);
	await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
}

test('each row saves and takes effect', async ({ page, browser }) => {
	test.setTimeout(120_000);
	const as = 'settings-flow';
	await signIn(page, { as });
	const { mia, ids } = await addChores(page, [{ name: 'Tidy the toy box' }]);
	await openSettings(page);
	await expect(row(page, /Children\s*Mia, Leo/)).toBeVisible();
	await expect(row(page, /Auto-lock\s*After 2 minutes/)).toBeVisible();
	await expect(row(page, /Back to Who’s flying\s*After 1 minute/)).toBeVisible();
	await expect(row(page, /Daily reset and bonus\s*6:00 am · \+20 stars bonus/)).toBeVisible();
	await expectAccessible(page);

	// Auto-lock: the bar follows at once.
	await row(page, /Auto-lock/).click();
	await expect(page.getByRole('radio', { name: '2 minutes' })).toBeChecked();
	await expect(page.getByRole('switch', { name: 'Lock when the app closes' })).toHaveAttribute(
		'aria-disabled',
		'true'
	);
	await expectAccessible(page);
	await page.getByText('5 minutes').click();
	await expect(page.getByText(/locks in [45]:\d\d/)).toBeVisible();
	await back(page);
	await expect(row(page, /Auto-lock\s*After 5 minutes/)).toBeVisible();

	// Back to Who's flying.
	await row(page, /Back to Who’s flying/).click();
	await page.getByText('30 seconds').click();
	await expect(page.getByRole('radio', { name: '30 seconds' })).toBeChecked();
	await expectAccessible(page);
	await back(page);
	await expect(row(page, /Back to Who’s flying\s*After 30 seconds/)).toBeVisible();

	// Daily reset and bonus.
	await row(page, /Daily reset and bonus/).click();
	await page.getByLabel('Reset time').selectOption({ label: '7:30' });
	await page.getByRole('button', { name: 'More' }).click();
	await expectAccessible(page);
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(row(page, /Daily reset and bonus\s*7:30 am · \+25 stars bonus/)).toBeVisible();

	// The child's trip uses the new bonus.
	const tablet = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(tablet, { as });
	await tablet.goto(`/trip/${mia}/bonus`);
	await expect(tablet.getByText('+25 bonus stars')).toBeVisible();

	// Notifications: safety alerts are locked, the others can be turned off.
	await row(page, /Notifications/).click();
	for (const name of [
		'PIN reset code sent',
		'Recovery email changed',
		'PIN pad locked after wrong tries'
	]) {
		const locked = page.getByRole('switch', { name });
		await expect(locked).toHaveAttribute('aria-disabled', 'true');
		await locked.click({ force: true });
		await expect(locked).toBeChecked();
	}
	await expectAccessible(page);
	const chores = page.getByRole('switch', { name: 'A chore is waiting' });
	await chores.click();
	await expect(chores).not.toBeChecked();
	await tablet.goto(`/trip/${mia}/stop/${ids['Tidy the toy box']}/confirm`);
	await tablet.getByRole('button', { name: 'Yes, I’m Mia' }).click();
	await expect(tablet.getByRole('status')).toBeVisible();
	expect(await alerts(page, as, 'A chore is ready to check')).toHaveLength(0);

	// ntfy: the topic and a test alert.
	await row(page, /ntfy/).click();
	await expect(page.getByLabel('Topic')).toHaveValue(/^[a-z0-9-]+$/);
	await expectAccessible(page);
	await page.getByRole('button', { name: 'Send a test alert' }).click();
	await expect(page.getByRole('status')).toHaveText('Test alert sent');
	expect(await alerts(page, as, 'Test alert')).toHaveLength(1);
	await back(page);
	await back(page);

	// Change PIN: the current one is needed, and the new one then works.
	await row(page, /Grown-up PIN/).click();
	await page.getByLabel('Current PIN').fill('9999');
	await page.getByLabel('New PIN').fill(NEW_PIN);
	await page.getByLabel('Type it again').fill(NEW_PIN);
	await page.getByRole('button', { name: 'Save PIN' }).click();
	await expect(page.getByRole('alert')).toHaveText('Wrong PIN, try again.');
	await expectAccessible(page);
	await page.getByLabel('Current PIN').fill(TEST_PIN);
	await page.getByLabel('Type it again').fill('0000');
	await page.getByRole('button', { name: 'Save PIN' }).click();
	await expect(page.getByRole('alert')).toHaveText("The PINs don't match. Try again.");
	await page.getByLabel('Current PIN').fill(TEST_PIN);
	await page.getByLabel('Type it again').fill(NEW_PIN);
	await page.getByRole('button', { name: 'Save PIN' }).click();
	await expect(page.getByRole('status')).toHaveText('PIN changed');
	await page.goto('/grown-up/settings');
	await typePin(page);
	await expect(page.getByText('Wrong PIN, try again.')).toBeVisible();
	await typePin(page, NEW_PIN);
	await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

	// Devices: the tablet is signed out, this device is not, then this one too.
	await row(page, /Sign-in and devices/).click();
	await expect(page.getByText(`s•••@example.test`)).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('button', { name: 'Sign out all other devices' }).click();
	await expect(page.getByRole('status')).toHaveText('Other devices signed out');
	await tablet.goto('/');
	await expect(tablet).toHaveURL(/\/login/);
	await page.getByRole('button', { name: 'Sign out of this device' }).click();
	await expect(page).toHaveURL(/\/login/);
	await page.goto('/');
	await expect(page).toHaveURL(/\/login/);
});

test('a shorter return time sends a trip back sooner', async ({ page }) => {
	await page.clock.install();
	await signIn(page, { as: 'settings-return' });
	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const { mia } = await addChores(page, [{ name: 'Tidy the toy box' }]);
	const res = await page.request.put('/api/grown-up/settings', {
		headers: { origin: BASE, 'content-type': 'application/json', 'x-grown-up': token },
		data: { autoReturnSeconds: 30 }
	});
	expect(res.status()).toBe(200);
	// Through the app, so the page is ready and its timer has started.
	await page.goto('/');
	await page.getByRole('link', { name: /^Mia/ }).click();
	await expect(page).toHaveURL(new RegExp(`/trip/${mia}$`));
	await expect(page.getByRole('heading', { name: 'Mia’s space trip' })).toBeVisible();
	await page.clock.runFor(19_000);
	await expect(page.getByRole('alertdialog')).toHaveCount(0);
	await page.clock.runFor(1_000);
	await expect(page.getByRole('alertdialog', { name: 'Still there, Mia?' })).toBeVisible();
});

test('settings need grown-up mode and stay within the family', async ({ page, browser }) => {
	await signIn(page, { as: 'settings-ours' });
	const json = { origin: BASE, 'content-type': 'application/json' };
	for (const [method, url, data] of [
		['get', '/api/grown-up/settings', undefined],
		['put', '/api/grown-up/settings', { dailyBonus: 50 }],
		['post', '/api/grown-up/settings/test-alert', {}],
		['post', '/api/grown-up/pin', { current: TEST_PIN, pin: NEW_PIN, again: NEW_PIN }],
		['post', '/api/grown-up/devices', { scope: 'others' }]
	] as const)
		expect((await page.request[method](url, { headers: json, data })).status()).toBe(401);

	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const headers = { ...json, 'x-grown-up': token };
	for (const data of [{ dailyBonus: 7 }, { autoLockMinutes: 9 }, { pinHash: 'x' }, {}])
		expect((await page.request.put('/api/grown-up/settings', { headers, data })).status()).toBe(
			400
		);
	expect(
		(await page.request.post('/api/grown-up/devices', { headers, data: { scope: 'all' } })).status()
	).toBe(400);
	expect(
		(
			await page.request.put('/api/grown-up/settings', { headers, data: { dailyBonus: 50 } })
		).status()
	).toBe(200);

	// Another family keeps its own settings and its devices stay signed in.
	const other = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(other, { as: 'settings-theirs' });
	const theirs = await (
		await other.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const view = await (
		await other.request.get('/api/grown-up/settings', {
			headers: { 'x-grown-up': theirs.token }
		})
	).json();
	expect(view.settings.dailyBonus).toBe(20);
	expect(
		(
			await page.request.post('/api/grown-up/devices', { headers, data: { scope: 'others' } })
		).status()
	).toBe(204);
	await other.goto('/');
	await expect(other).not.toHaveURL(/\/login/);
});
