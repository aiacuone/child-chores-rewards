import { expect, test, type Page } from '@playwright/test';
import { BASE, TEST_PIN, addChores, expectAccessible, signIn } from './helpers';

// The grown-up check (#24): accept with undo, send back with a message, and
// "That wasn't Mia". A tablet shows Mia's trip while a phone answers.

type SentAlert = { topic: string; headers: Record<string, string>; body: string };

async function typePin(page: Page) {
	for (const d of TEST_PIN) await page.getByRole('button', { name: d, exact: true }).click();
}

/** Mia taps "I did it!" on a stop and confirms. */
async function iDidIt(tablet: Page, name: string) {
	await tablet.getByRole('link', { name: new RegExp(name) }).click();
	await tablet.getByRole('link', { name: 'I did it!' }).click();
	await tablet.getByRole('button', { name: 'Yes, I’m Mia' }).click();
	await expect(tablet.getByRole('status')).toBeVisible();
}

test('a grown-up accepts, undoes, sends back and moves chores', async ({ page, browser }) => {
	test.setTimeout(60_000);
	await signIn(page, { as: 'check-flow' });
	const { mia } = await addChores(page, [
		{ name: 'Feed Biscuit the dog' },
		{ name: 'Make your bed' }
	]);

	const tablet = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(tablet, { as: 'check-flow' });
	await tablet.goto(`/trip/${mia}`);
	const stops = tablet.getByRole('list', { name: 'Today’s stops' }).getByRole('listitem');

	// Mia sends Feed Biscuit the dog. The alert opens its check screen after the PIN.
	await iDidIt(tablet, 'Feed Biscuit the dog');
	const { alerts } = (await (await page.request.get('/test/outbox?as=check-flow')).json()) as {
		alerts: SentAlert[];
	};
	const click = alerts.findLast((a) => a.headers.Title === 'A chore is ready to check')!.headers
		.Click;
	expect(click).toMatch(new RegExp(`^${BASE}/grown-up/check/\\d+$`));
	await page.goto(click);
	await typePin(page);
	await expect(page.getByRole('heading', { name: 'Feed Biscuit the dog' })).toBeVisible();
	await expect(page.getByText(/Mia says it’s done · \d{1,2}:\d\d (am|pm)/)).toBeVisible();
	await expectAccessible(page);

	// Accept: Mia's rocket flies on, and the tablet says so without a reload.
	await page.getByRole('button', { name: 'Yes, it’s done! +10 stars' }).click();
	const notice = page.getByRole('status');
	await expect(notice).toHaveText(/Checked! Mia’s rocket flew on \(\+10 stars\)\s*Undo 0:5\d/);
	await expect(tablet.getByRole('status')).toHaveText('Feed Biscuit the dog checked! +10 stars', {
		timeout: 10_000
	});
	await expect(stops.first()).toHaveText(/Feed Biscuit the dog\s*Done!/);

	// Undo: back to waiting, and the stars go again.
	await page.getByRole('button', { name: /^Undo/ }).click();
	await expect(notice).toHaveText('Undone. Mia’s chore is waiting again');
	await expect(
		page.getByRole('link', { name: /Feed Biscuit the dog\s*Mia says it’s done/ })
	).toBeVisible();
	await expect(stops.first()).toHaveText(/Feed Biscuit the dog\s*Grown-up checking/, {
		timeout: 10_000
	});

	// Not done yet, from Mission control: Mia sees the message and the stop opens again.
	await page.getByRole('link', { name: 'Home' }).click();
	await expect(page.getByText(/1 stop to check\s*Mia: Feed Biscuit the dog/)).toBeVisible();
	await expect(page.getByRole('progressbar', { name: 'Mia’s stops today' })).toHaveAttribute(
		'aria-valuetext',
		'1 of 2 stops done'
	);
	await expectAccessible(page);
	await page.getByRole('link', { name: /1 stop to check/ }).click();
	await page.getByRole('link', { name: 'Not done yet' }).click();
	await expect(page.getByRole('heading', { name: 'Send it back' })).toBeVisible();
	await page.getByText('Please finish it properly').click();
	await expectAccessible(page);
	await page.getByRole('button', { name: 'Send back' }).click();
	await expect(notice).toHaveText('Sent back to Mia with your message');
	await expect(tablet.getByRole('status')).toHaveText(
		'Grown-up says: “Please finish it properly.”',
		{
			timeout: 10_000
		}
	);
	await expect(stops.first()).toHaveText(/Feed Biscuit the dog\s*Up next/);

	// That wasn't Mia: Leo gets the stars, and Mia's stop stays open.
	await iDidIt(tablet, 'Make your bed');
	await page.getByRole('link', { name: /Make your bed\s*Mia says it’s done/ }).click({
		timeout: 10_000
	});
	await page.getByRole('link', { name: 'That wasn’t Mia' }).click();
	await expect(page.getByRole('heading', { name: 'Who really did it?' })).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('button', { name: /Leo\s*Move here/ }).click();
	await expect(notice).toHaveText('Moved to Leo’s trip. Stars go to Leo');
	await tablet.goto('/');
	await expect(tablet.getByRole('link', { name: /^Leo/ })).toContainText('10');
	await expect(tablet.getByRole('link', { name: /^Mia/ })).toContainText('0');
	await tablet.context().close();
});

test('another family’s check screen and answers are not found', async ({ page, browser }) => {
	await signIn(page, { as: 'check-ours' });
	const { mia, ids } = await addChores(page, [{ name: 'Make your bed' }]);
	await page.goto(`/trip/${mia}/stop/${ids['Make your bed']}/confirm`);
	await page.getByRole('button', { name: 'Yes, I’m Mia' }).click();
	const { alerts } = (await (await page.request.get('/test/outbox?as=check-ours')).json()) as {
		alerts: SentAlert[];
	};
	const copyId = alerts
		.findLast((a) => a.headers.Title === 'A chore is ready to check')!
		.headers.Click.split('/')
		.pop();

	const other = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(other, { as: 'check-theirs' });
	const { token } = await (
		await other.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const headers = { origin: BASE, 'content-type': 'application/json', 'x-grown-up': token };
	expect((await other.request.get(`/api/grown-up/checks/${copyId}`, { headers })).status()).toBe(
		404
	);
	expect(
		(
			await other.request.post(`/api/grown-up/checks/${copyId}`, {
				headers,
				data: { action: 'accept' }
			})
		).status()
	).toBe(404);
	expect(
		(
			(await (await other.request.get('/api/grown-up/checks', { headers })).json()) as {
				checks: unknown[];
			}
		).checks
	).toEqual([]);
	// Without grown-up mode, nothing.
	expect(
		(
			await page.request.post(`/api/grown-up/checks/${copyId}`, {
				headers: { origin: BASE, 'content-type': 'application/json' },
				data: { action: 'accept' }
			})
		).status()
	).toBe(401);
	await other.context().close();
});
