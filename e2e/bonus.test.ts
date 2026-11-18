import { expect, test, type Page } from '@playwright/test';
import { BASE, TEST_PIN, addChores, expectAccessible, signIn } from './helpers';

// The daily bonus and the end of the trip (#25).

type SentAlert = { headers: Record<string, string> };

/** Mia sends a stop, and a grown-up accepts it through the API. */
async function finish(page: Page, mia: number, choreId: number, token: string) {
	await page.goto(`/trip/${mia}/stop/${choreId}/confirm`);
	await page.getByRole('button', { name: 'Yes, I’m Mia' }).click();
	await expect(page.getByRole('status')).toBeVisible();
	const { alerts } = (await (await page.request.get('/test/outbox?as=bonus-flow')).json()) as {
		alerts: SentAlert[];
	};
	const copy = alerts.at(-1)!.headers.Click.split('/').pop();
	const res = await page.request.post(`/api/grown-up/checks/${copy}`, {
		headers: { origin: BASE, 'content-type': 'application/json', 'x-grown-up': token },
		data: { action: 'accept' }
	});
	expect(res.status()).toBe(204);
}

test('finishing every stop earns the bonus and completes the trip', async ({ page }) => {
	await signIn(page, { as: 'bonus-flow' });
	const { mia, ids } = await addChores(page, [
		{ name: 'Make your bed' },
		{ name: 'Set the table' }
	]);

	// Before: the bonus planet says what to do.
	await page.goto(`/trip/${mia}`);
	await page.getByRole('link', { name: '+20 bonus' }).click();
	await expect(page.getByRole('heading', { name: 'Finish the whole trip' })).toBeVisible();
	await expect(page.getByText('Do all 2 stops today and get +20 bonus stars.')).toBeVisible();
	await expect(page.getByRole('progressbar', { name: 'Stops done today' })).toHaveAttribute(
		'aria-valuetext',
		'0 of 2 stops done'
	);
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Back to my trip' }).click();
	await expect(page).toHaveURL(`${BASE}/trip/${mia}`);

	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	await finish(page, mia, ids['Make your bed'], token);
	await finish(page, mia, ids['Set the table'], token);

	// After: trip complete, with 10 + 10 + 20 stars.
	await page.goto(`/trip/${mia}`);
	await expect(page.getByText('2 of 2 stops', { exact: true })).toBeVisible();
	await page.getByRole('link', { name: '+20 bonus' }).click();
	await expect(page.getByRole('heading', { name: 'Trip complete!' })).toBeVisible();
	await expect(page.getByText('+20 bonus stars')).toBeVisible();
	await expect(page.getByText('2 of 2 stops')).toBeVisible();
	await expect(page.getByText('40 stars', { exact: true })).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Back to Who’s flying' }).click();
	await expect(page).toHaveURL(`${BASE}/`);
});
