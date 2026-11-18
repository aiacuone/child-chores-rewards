// Settings, Grown-ups: invites decide which new Google accounts can sign in.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { BASE, TEST_PIN, expectAccessible, signIn, typePin } from './helpers';

const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name });

async function openGrownUps(page: Page, rowName: RegExp) {
	await page.goto('/grown-up/settings');
	await typePin(page);
	await page.getByRole('link', { name: rowName }).click();
	await expect(page.getByRole('heading', { name: 'Grown-ups', exact: true })).toBeVisible();
}

async function invite(page: Page, email: string) {
	await page.getByRole('link', { name: 'Invite a grown-up' }).click();
	await page.getByLabel('Their Google email').fill(email);
	await button(page, 'Send invite').click();
}

/** A new device signing in the way the live site does. */
async function device(browser: Browser, as: string) {
	const context = await browser.newContext({ baseURL: BASE });
	const page = await context.newPage();
	await page.goto(`/test/sign-in?as=${as}&invited=1`);
	return page;
}

const refused = (page: Page) =>
	expect(page.getByText('That Google account is not on the list.')).toBeVisible();

test('invite, refuse, join and remove', async ({ page, browser }) => {
	test.setTimeout(90_000);
	await signIn(page, { as: 'gu-owner' });
	await openGrownUps(page, /Grown-ups\s*Just you/);
	await expect(page.getByText('You', { exact: true })).toBeVisible();
	await expect(page.getByText('Owner', { exact: true })).toBeVisible();
	await expectAccessible(page);

	// The form refuses a bad address and an account that already exists.
	await page.getByRole('link', { name: 'Invite a grown-up' }).click();
	await expectAccessible(page);
	await page.getByLabel('Their Google email').fill('not an email');
	await button(page, 'Send invite').click();
	await expect(page.getByRole('alert')).toHaveText('Check the email address.');
	await page.getByLabel('Their Google email').fill('gu-owner@example.test');
	await button(page, 'Send invite').click();
	await expect(page.getByRole('alert')).toHaveText(
		'That Google account already uses Rocket Rewards.'
	);
	await page.getByRole('link', { name: 'Cancel' }).click();

	// Not invited yet: refused.
	const early = await device(browser, 'gu-sam');
	await refused(early);
	await early.context().close();

	await invite(page, 'gu-sam@example.test');
	await expect(page.getByRole('status')).toHaveText('Invite sent to gu-sam@example.test');
	await expect(button(page, /gu-sam.*invite sent.*Waiting/)).toBeVisible();
	await expectAccessible(page);
	const { emails } = (await (await page.request.get('/test/outbox')).json()) as {
		emails: { to: string; text: string }[];
	};
	const sent = emails.find((e) => e.to === 'gu-sam@example.test');
	expect(sent?.text).toContain('sign in with Google');
	expect(sent?.text).not.toContain('Mia');

	// A cancelled invite no longer works.
	await button(page, /gu-sam.*Waiting/).click();
	await expect(page.getByRole('alertdialog', { name: 'Cancel invite?' })).toBeVisible();
	await expectAccessible(page);
	await button(page, 'Yes, cancel invite').click();
	await expect(page.getByRole('status')).toHaveText('Invite cancelled');
	const cancelled = await device(browser, 'gu-sam');
	await refused(cancelled);
	await cancelled.context().close();

	// Invited again, Sam joins this family and the owner's list follows.
	await invite(page, 'gu-sam@example.test');
	await expect(button(page, /gu-sam.*Waiting/)).toBeVisible();
	const sam = await device(browser, 'gu-sam');
	await expect(sam.getByRole('link', { name: /^Mia/ })).toBeVisible();
	await expect(button(page, /Test gu-sam.*Remove/)).toBeVisible({ timeout: 15_000 });

	// Sam is not the owner: nothing to remove here, and the server refuses too.
	await openGrownUps(sam, /Grown-ups\s*2 grown-ups/);
	await expect(button(sam, /Remove/)).toHaveCount(0);
	const { token } = await (
		await sam.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const headers = { origin: BASE, 'x-grown-up': token };
	const { people } = await (await sam.request.get('/api/grown-up/grown-ups', { headers })).json();
	for (const person of people as { id: number }[]) {
		const res = await sam.request.delete(`/api/grown-up/grown-ups/${person.id}`, { headers });
		expect(res.status()).toBe(403);
	}

	// Removing Sam signs them out, and they cannot come back without an invite.
	await button(page, /Test gu-sam.*Remove/).click();
	await button(page, 'Yes, remove Test gu-sam').click();
	await expect(page.getByRole('status')).toHaveText('Test gu-sam was removed');
	await sam.goto('/');
	await expect(sam).toHaveURL(/\/login/);
	await sam.goto('/test/sign-in?as=gu-sam&invited=1');
	await refused(sam);
	await sam.context().close();
});

test('another family cannot change these invites or grown-ups', async ({ page, browser }) => {
	await signIn(page, { as: 'gu-ours' });
	await openGrownUps(page, /Grown-ups/);
	await invite(page, 'gu-pat@example.test');
	await expect(button(page, /gu-pat.*Waiting/)).toBeVisible();
	const ours = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const list = await (
		await page.request.get('/api/grown-up/grown-ups', { headers: { 'x-grown-up': ours.token } })
	).json();

	const context = await browser.newContext({ baseURL: BASE });
	const other = await context.newPage();
	await signIn(other, { as: 'gu-theirs' });
	const { token } = await (
		await other.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const headers = { origin: BASE, 'x-grown-up': token };
	const inviteRes = await other.request.delete(
		`/api/grown-up/grown-ups/invites/${list.invites[0].id}`,
		{ headers }
	);
	expect(inviteRes.status()).toBe(404);
	const personRes = await other.request.delete(`/api/grown-up/grown-ups/${list.people[0].id}`, {
		headers
	});
	expect(personRes.status()).toBe(404);
	const seen = await (await other.request.get('/api/grown-up/grown-ups', { headers })).json();
	expect(JSON.stringify(seen)).not.toContain('gu-pat');
	await context.close();

	expect((await page.request.get('/api/grown-up/grown-ups')).status()).toBe(401);
});
