import { expect, test } from '@playwright/test';
import {
	BASE,
	TEST_PIN,
	acceptStop,
	addChores,
	expectAccessible,
	signIn,
	typePin
} from './helpers';

// The Ranks tab and a child's star history (#28), for grown-ups only.

const grownUp = (token: string) => ({
	origin: BASE,
	'content-type': 'application/json',
	'x-grown-up': token
});

test('the Ranks tab and the star history show what stands', async ({ page, browser }) => {
	test.setTimeout(120_000);
	await signIn(page, { as: 'history-flow' });
	const { mia, ids } = await addChores(page, [
		{ name: 'Make your bed' },
		{ name: 'Set the table' }
	]);
	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();

	// Nothing yet: the empty history.
	await page.goto('/grown-up');
	await typePin(page);
	await page.getByRole('link', { name: 'Ranks' }).click();
	await expect(page.getByRole('heading', { name: 'Ranks', exact: true })).toBeVisible();
	await page.getByRole('link', { name: /Star history/ }).click();
	await expect(page.getByRole('heading', { name: 'No stars yet' })).toBeVisible();
	await expect(page.getByText('Stars show up here when a grown-up accepts a chore.')).toBeVisible();
	await expectAccessible(page);

	// Two chores and the bonus, then a reward handed out.
	await acceptStop(page, 'history-flow', mia, ids['Make your bed'], token);
	await acceptStop(page, 'history-flow', mia, ids['Set the table'], token);
	const reward = await page.request.post('/api/grown-up/rewards', {
		headers: grownUp(token),
		data: { name: 'Sticker', cost: 5, colour: 'blue', childIds: [mia] }
	});
	expect(reward.status()).toBe(201);
	const tablet = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(tablet, { as: 'history-flow' });
	await tablet.goto(`/trip/${mia}/rewards`);
	await tablet.getByRole('button', { name: 'Claim Sticker' }).click();
	const { alerts } = (await (await page.request.get('/test/outbox?as=history-flow')).json()) as {
		alerts: { headers: Record<string, string> }[];
	};
	const claim = alerts.findLast((a) => a.headers.Title === 'A reward was claimed')!.headers.Click;
	const handed = await page.request.post(`/api/grown-up/claims/${claim.split('/').pop()}`, {
		headers: grownUp(token),
		data: { action: 'handOut' }
	});
	expect(handed.status()).toBe(204);

	// The Ranks tab: 10 + 10 + 20 - 5 = 35 stars, so Mia is still a Cadet.
	await page.goto('/grown-up/ranks');
	await typePin(page);
	await expect(page.getByText('35 stars').first()).toBeVisible();
	await expect(page.getByText('Rank ladder · Mia')).toBeVisible();
	await expect(page.getByRole('listitem')).toHaveText([
		/Cadet\s*Plain rocket\s*0 stars/,
		/Pilot\s*Wing and hull stripes\s*50 stars/,
		/Explorer\s*Side boosters\s*100 stars/,
		/Captain\s*Gold collar and wing tips\s*250 stars/,
		/Commander\s*Gold star and glow\s*500 stars/
	]);
	await expect(page.getByRole('listitem').first()).toHaveAttribute('aria-current', 'true');
	await expectAccessible(page);

	// The history: today's rows newest first, with the reward as a spend.
	await page.getByRole('link', { name: /Star history/ }).click();
	await expect(page.getByRole('heading', { name: 'Star history' })).toBeVisible();
	await expect(page.getByText('35 stars', { exact: true })).toBeVisible();
	const items = page.getByRole('listitem');
	await expect(items).toHaveCount(4);
	await expect(items.nth(0)).toHaveAttribute('aria-label', /^Spent 5 stars: Sticker handed out, /);
	await expect(items.nth(1)).toHaveAttribute('aria-label', /^Earned 20 stars: Daily bonus, /);
	await expect(items.nth(2)).toHaveAttribute('aria-label', /^Earned 10 stars: Set the table, /);
	await expect(items.nth(3)).toHaveAttribute('aria-label', /^Earned 10 stars: Make your bed, /);
	await expect(items.nth(0)).toContainText('−5');
	await expect(items.nth(1)).toContainText('+20');
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Back' }).click();
	await expect(page.getByRole('heading', { name: 'Ranks', exact: true })).toBeVisible();
});

test('children and other families cannot read a star history', async ({ page, browser }) => {
	await signIn(page, { as: 'history-ours' });
	const { mia } = await addChores(page, [{ name: 'Make your bed' }]);

	// A child's device has no grown-up token: the API refuses, the page asks for the PIN.
	expect((await page.request.get(`/api/grown-up/history/${mia}`)).status()).toBe(401);
	expect((await page.request.get('/api/grown-up/ranks')).status()).toBe(401);
	await page.goto(`/grown-up/ranks/${mia}/history`);
	await expect(page.getByRole('button', { name: '1', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Star history' })).toHaveCount(0);

	// Another family's grown-up: not found, whatever the id.
	const other = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(other, { as: 'history-theirs' });
	const { token } = await (
		await other.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	for (const id of [String(mia), '0', 'abc', '99999999999']) {
		expect(
			(await other.request.get(`/api/grown-up/history/${id}`, { headers: grownUp(token) })).status()
		).toBe(404);
	}
});
