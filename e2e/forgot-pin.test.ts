import { expect, test, type Page } from '@playwright/test';
import { BASE, TEST_PIN, expectAccessible, signIn, typePin } from './helpers';

// Forgot PIN and the recovery email (#30). The code goes only to the confirmed
// address, the PIN is never emailed, and every grown-up is told.

type Outbox = {
	emails: { to: string; subject: string; text: string }[];
	alerts: { headers: Record<string, string>; body: string }[];
};
const NEW_PIN = '5678';
const form = { origin: BASE, accept: 'text/html' };

const outbox = async (page: Page, as: string) =>
	(await (await page.request.get(`/test/outbox?as=${as}`)).json()) as Outbox;
const alerts = async (page: Page, as: string, title: string) =>
	(await outbox(page, as)).alerts.filter((a) => a.headers.Title === title);
const lastMail = async (page: Page, as: string, to: string) =>
	(await outbox(page, as)).emails.findLast((e) => e.to === to)!;
const codeIn = (text: string) => /\b(\d{6})\b/.exec(text)![1];

/** Through Settings: ask for a new address and confirm the link it receives. */
async function changeEmail(page: Page, as: string, email: string, confirm = true) {
	await page.goto('/grown-up/settings/recovery/edit');
	await typePin(page);
	await page.getByLabel('New recovery email').fill(email);
	await page.getByLabel('Your grown-up PIN').fill(TEST_PIN);
	await page.getByRole('button', { name: 'Send link' }).click();
	await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
	const link = /https?:\S+/.exec((await lastMail(page, as, email)).text)![0];
	if (!confirm) return link;
	await page.goto(link);
	await page.getByRole('button', { name: 'Confirm' }).click();
	await expect(page.getByRole('status')).toContainText('Recovery email confirmed');
	return link;
}

async function sendCode(page: Page, as: string, email: string) {
	await page.goto('/grown-up');
	await page.getByRole('link', { name: 'Forgot PIN?' }).click();
	await page.getByRole('button', { name: 'Send code' }).click();
	await expect(page.getByRole('heading', { name: 'Set a new PIN' })).toBeVisible();
	return codeIn((await lastMail(page, as, email)).text);
}

test('change the recovery email, then reset a forgotten PIN', async ({ page }) => {
	test.setTimeout(120_000);
	const as = 'forgot-flow';
	const first = `${as}-1@example.test`;
	const second = `${as}-2@example.test`;
	await signIn(page, { as });

	// From Settings, with the PIN asked again.
	await page.goto('/grown-up');
	await typePin(page);
	await page.getByRole('link', { name: 'Settings' }).click();
	await page.getByRole('link', { name: /Recovery email/ }).click();
	await expect(page.getByText('No email confirmed yet')).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Change email' }).click();
	await page.getByLabel('New recovery email').fill(first);
	await page.getByLabel('Your grown-up PIN').fill('9999');
	await page.getByRole('button', { name: 'Send link' }).click();
	await expect(page.getByRole('alert')).toHaveText('Wrong PIN, try again.');
	await expectAccessible(page);

	// The first address is not a "change", so no alert.
	await changeEmail(page, as, first);
	expect(await alerts(page, as, 'Recovery email changed')).toHaveLength(0);

	// A new address: the old one stays in use until the link is confirmed.
	const link = await changeEmail(page, as, second, false);
	await expectAccessible(page);
	await page.goto('/forgot-pin');
	await expect(page.getByText('f•••@example.test')).toBeVisible();
	await page.goto(link);
	await page.getByRole('button', { name: 'Confirm' }).click();
	await expect(page.getByRole('status')).toContainText('Recovery email confirmed');
	const [changed] = await alerts(page, as, 'Recovery email changed');
	expect(changed.body).not.toContain('example.test');
	expect(changed.headers.Cache).toBe('no');

	// Forgot PIN: the code goes to the new address, and grown-ups are told.
	await page.goto('/grown-up');
	await page.getByRole('link', { name: 'Forgot PIN?' }).click();
	await expect(page.getByRole('heading', { name: 'Forgot your PIN?' })).toBeVisible();
	await expectAccessible(page);
	const code = await sendCode(page, as, second);
	const mail = await lastMail(page, as, second);
	expect(mail.text).not.toMatch(new RegExp(`\\b${TEST_PIN}\\b`));
	const [sent] = await alerts(page, as, 'PIN reset code sent');
	expect(sent.body).toBe(
		'A PIN reset code was sent. If this wasn’t you, open the app and change the PIN.'
	);
	await expectAccessible(page);

	// A wrong code, and PINs that differ, do not change anything.
	await page.getByLabel('Code from email').fill(code === '000000' ? '000001' : '000000');
	await page.getByLabel('New PIN').fill(NEW_PIN);
	await page.getByLabel('Type it again').fill(NEW_PIN);
	await page.getByRole('button', { name: 'Save PIN' }).click();
	await expect(page.getByRole('alert')).toHaveText(
		/That code isn’t right\. Check your email and try again\./
	);
	await expectAccessible(page);
	await page.getByLabel('Code from email').fill(code);
	await page.getByLabel('Type it again').fill('0000');
	await page.getByRole('button', { name: 'Save PIN' }).click();
	await expect(page.getByRole('alert')).toHaveText("The PINs don't match. Try again.");

	// The right code: back at the PIN pad, where only the new PIN works.
	await page.getByLabel('Type it again').fill(NEW_PIN);
	await page.getByRole('button', { name: 'Save PIN' }).click();
	await expect(page.getByRole('heading', { name: 'Grown-up PIN' })).toBeVisible();
	await typePin(page);
	await expect(page.getByText('Wrong PIN, try again.')).toBeVisible();
	await typePin(page, NEW_PIN);
	await expect(page.getByRole('heading', { name: 'Mission control' })).toBeVisible();
});

test('five wrong codes cancel it, and a new one can be sent', async ({ page }) => {
	const as = 'forgot-wrong';
	const email = `${as}@example.test`;
	await signIn(page, { as });
	await changeEmail(page, as, email);
	const code = await sendCode(page, as, email);
	const wrong = code === '000000' ? '000001' : '000000';
	const post = () =>
		page.request.post('/forgot-pin/reset', {
			headers: form,
			form: { code: wrong, pin: NEW_PIN, again: NEW_PIN },
			maxRedirects: 0
		});
	for (let i = 1; i < 5; i++) expect((await post()).status()).toBe(400);
	await page.getByLabel('Code from email').fill(wrong);
	await page.getByLabel('New PIN').fill(NEW_PIN);
	await page.getByLabel('Type it again').fill(NEW_PIN);
	await page.getByRole('button', { name: 'Save PIN' }).click();
	await expect(page.getByRole('heading', { name: 'That code has been cancelled' })).toBeVisible();
	await expectAccessible(page);

	// The right code no longer works.
	const late = await page.request.post('/forgot-pin/reset', {
		headers: form,
		form: { code, pin: NEW_PIN, again: NEW_PIN },
		maxRedirects: 0
	});
	expect(late.headers().location).toBe('/forgot-pin/reset');

	await page.getByRole('button', { name: 'Send a new code' }).click();
	await expect(page.getByRole('heading', { name: 'Set a new PIN' })).toBeVisible();
	expect(await alerts(page, as, 'PIN reset code sent')).toHaveLength(2);
	await page.goto('/grown-up');
	await typePin(page);
	await expect(page.getByRole('heading', { name: 'Mission control' })).toBeVisible();
});

test('the routes refuse what they should', async ({ page, browser }) => {
	const as = 'forgot-guard';
	await signIn(page, { as });

	// No confirmed address: nothing to send to, and nothing is sent.
	await page.goto('/forgot-pin');
	await expect(page.getByRole('alert')).toContainText('No recovery email is confirmed yet');
	await expect(page.getByRole('button', { name: 'Send code' })).toHaveCount(0);
	await expectAccessible(page);
	const refused = await page.request.post('/forgot-pin', {
		headers: form,
		form: { send: '1' },
		maxRedirects: 0
	});
	expect(refused.status()).toBe(400);
	expect(await alerts(page, as, 'PIN reset code sent')).toHaveLength(0);

	// The recovery email needs grown-up mode.
	const json = { origin: BASE, 'content-type': 'application/json' };
	const data = { email: 'x@example.test', pin: TEST_PIN };
	expect((await page.request.get('/api/grown-up/recovery')).status()).toBe(401);
	expect(
		(await page.request.post('/api/grown-up/recovery', { headers: json, data })).status()
	).toBe(401);
	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const headers = { ...json, 'x-grown-up': token };
	for (const [bad, status] of [
		[{ email: 'not an email', pin: TEST_PIN }, 400],
		[{ email: 'x@example.test', pin: '12' }, 403],
		[{ email: 'x@example.test', pin: '9999' }, 403]
	] as const)
		expect(
			(await page.request.post('/api/grown-up/recovery', { headers, data: bad })).status()
		).toBe(status);
	expect((await outbox(page, as)).emails.filter((e) => e.to === 'x@example.test')).toEqual([]);

	// One family's code does nothing for another family.
	await changeEmail(page, as, `${as}@example.test`);
	const code = await sendCode(page, as, `${as}@example.test`);
	const other = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(other, { as: 'forgot-other' });
	const res = await other.request.post('/forgot-pin/reset', {
		headers: form,
		form: { code, pin: NEW_PIN, again: NEW_PIN },
		maxRedirects: 0
	});
	expect(res.headers().location).toBe('/forgot-pin/reset');
	expect(
		await (await other.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })).json()
	).toMatchObject({ result: 'ok' });

	// Signed out, none of it opens.
	const stranger = await (await browser.newContext({ baseURL: BASE })).newPage();
	const out = await stranger.request.get('/forgot-pin', { maxRedirects: 0 });
	expect(out.status()).toBe(303);
	expect(out.headers().location).toContain('/login');
});
