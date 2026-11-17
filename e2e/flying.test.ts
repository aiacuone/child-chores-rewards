import { expect, test } from '@playwright/test';
import { expectAccessible, signIn } from './helpers';

// Who's flying (#18): a tile per child, the one-time home screen tip, a
// child's trip with "Not Mia? Switch", and the return after no touches.

const TIP = 'Tip: use “Add to Home Screen” so Rocket Rewards opens full screen. Only shown once.';

test('every device starts on Who’s flying, with a tile per child', async ({ page }) => {
	await signIn(page);
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('heading', { name: 'Who’s flying today?' })).toBeVisible();
	await expect(page.getByRole('link', { name: /^Mia/ })).toContainText('Cadet · 0 stars');
	await expect(page.getByRole('link', { name: /^Leo/ })).toBeVisible();
	await expect(page.getByRole('link', { name: 'I’m a grown-up' })).toHaveAttribute(
		'href',
		'/grown-up'
	);
	await expectAccessible(page);
});

test('the home screen tip shows once per device', async ({ page }) => {
	await signIn(page);
	await expect(page.getByText(TIP)).toBeVisible();
	await page.reload();
	await expect(page.getByRole('heading', { name: 'Who’s flying today?' })).toBeVisible();
	await expect(page.getByText(TIP)).toHaveCount(0);
});

test('a child opens their trip and can switch back', async ({ page }) => {
	await signIn(page);
	await page.getByRole('link', { name: /^Mia/ }).click();
	await expect(page).toHaveURL(/\/trip\/\d+$/);
	await expect(page.getByRole('heading', { name: 'Mia’s space trip' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Nothing to do today!' })).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Not Mia? Switch' }).click();
	await expect(page).toHaveURL('/');
});

test('an idle trip warns for 10 seconds, then goes back', async ({ page }) => {
	await page.clock.install();
	await signIn(page);
	await page.getByRole('link', { name: /^Mia/ }).click();
	await expect(page.getByRole('heading', { name: 'Mia’s space trip' })).toBeVisible();

	// 49 seconds: nothing yet.
	await page.clock.runFor(49_000);
	await expect(page.getByRole('alertdialog')).toHaveCount(0);

	// 50 seconds: "Still there, Mia?" with 10 seconds to go.
	await page.clock.runFor(1_000);
	const dialog = page.getByRole('alertdialog', { name: 'Still there, Mia?' });
	await expect(dialog).toBeVisible();
	await expect(dialog).toContainText('10');
	await expect(page.getByRole('button', { name: 'I’m here!' })).toBeFocused();
	await expectAccessible(page);

	// "I'm here!" keeps the trip and starts again.
	await page.getByRole('button', { name: 'I’m here!' }).click();
	await expect(dialog).toHaveCount(0);

	// No answer: back to Who's flying.
	await page.clock.runFor(50_000);
	await expect(dialog).toBeVisible();
	await page.clock.runFor(10_000);
	await expect(page).toHaveURL('/');
});

test('“That’s not me” goes straight back', async ({ page }) => {
	await page.clock.install();
	await signIn(page);
	await page.getByRole('link', { name: /^Leo/ }).click();
	await expect(page.getByRole('heading', { name: 'Leo’s space trip' })).toBeVisible();
	await page.clock.runFor(50_000);
	await page.getByRole('link', { name: 'That’s not me' }).click();
	await expect(page).toHaveURL('/');
});

test('touching the screen keeps the trip open', async ({ page }) => {
	await page.clock.install();
	await signIn(page);
	await page.getByRole('link', { name: /^Mia/ }).click();
	await expect(page.getByRole('heading', { name: 'Mia’s space trip' })).toBeVisible();
	await page.clock.runFor(45_000);
	await page.mouse.click(200, 600);
	await page.clock.runFor(45_000);
	await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test("another family's child, or a made-up id, is not found", async ({ page, browser }) => {
	await signIn(page);
	await page.getByRole('link', { name: /^Mia/ }).click();
	await expect(page).toHaveURL(/\/trip\/\d+$/);
	const ours = new URL(page.url()).pathname;

	const otherDevice = await browser.newContext({ baseURL: 'http://localhost:4173' });
	const other = await otherDevice.newPage();
	await signIn(other, { as: 'other-family' });
	await expect(other.getByRole('link', { name: /^Mia/ })).toBeVisible();
	for (const path of [ours, '/trip/999999', '/trip/abc', '/trip/-1', '/trip/1.5']) {
		const res = await other.goto(path);
		expect(res?.status(), path).toBe(404);
	}
	await otherDevice.close();
});
