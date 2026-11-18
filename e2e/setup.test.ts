import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, signIn } from './helpers';

const RECOVERY = 'setup-flow-recovery@example.test';

type Outbox = {
	emails: { to: string; subject: string; text: string }[];
	alerts: { topic: string; headers: Record<string, string>; body: string }[];
};
const outbox = async (page: Page): Promise<Outbox> =>
	(await page.request.get('/test/outbox')).json();

// Grown-up setup (#16, #17): children, PIN, recovery email, alerts, then all set.

test('a new family goes through all four setup steps', async ({ page }) => {
	await signIn(page, { as: 'setup-flow', newFamily: true });
	await expect(page).toHaveURL('/setup/children');
	await expect(page.getByRole('heading', { name: 'Who’s flying?' })).toBeVisible();
	await expect(page.getByText('Signed in with Google · s•••@example.test')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back' })).toHaveCount(0);
	await expectAccessible(page);

	// Nothing typed yet.
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('alert')).toHaveText('Add a name for each child.');

	await page.getByLabel('Child 1', { exact: true }).fill('Mia');
	await page.getByRole('button', { name: 'Add another child' }).click();
	await page.getByLabel('Child 2', { exact: true }).fill('Leo');
	// The second child starts on the next free colour.
	await expect(
		page.getByRole('group', { name: 'Child 2 rocket colour' }).getByRole('radio', { name: 'Blue' })
	).toBeChecked();
	await page
		.getByRole('group', { name: 'Child 2 rocket colour' })
		.getByRole('radio', { name: 'Purple' })
		.check();
	await page.getByRole('button', { name: 'Next' }).click();

	await expect(page).toHaveURL('/setup/pin');
	await expect(page.getByRole('heading', { name: 'Choose a grown-up PIN' })).toBeVisible();
	await expectAccessible(page);

	await page.getByLabel('PIN', { exact: true }).fill('12');
	await page.getByLabel('Type it again').fill('12');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('alert')).toHaveText('Use 4 numbers.');

	await page.getByLabel('PIN', { exact: true }).fill('4826');
	await page.getByLabel('Type it again').fill('4827');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('alert')).toHaveText("The PINs don't match. Try again.");

	// Back to step 1 keeps the children.
	await page.getByRole('link', { name: 'Back' }).click();
	await expect(page.getByLabel('Child 2', { exact: true })).toHaveValue('Leo');
	await expect(
		page
			.getByRole('group', { name: 'Child 2 rocket colour' })
			.getByRole('radio', { name: 'Purple' })
	).toBeChecked();
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByLabel('PIN', { exact: true }).fill('4826');
	await page.getByLabel('Type it again').fill('4826');
	await page.getByRole('button', { name: 'Next' }).click();

	// Step 3: recovery email. No way back to the PIN, which is now locked.
	await expect(page).toHaveURL('/setup/email');
	await expect(page.getByRole('heading', { name: 'Recovery email' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back' })).toHaveCount(0);
	await expectAccessible(page);
	for (const path of ['/setup/children', '/setup/pin']) {
		await page.goto(path);
		await expect(page, path).toHaveURL('/setup/email');
	}
	await page.getByLabel('Email').fill('jane@example');
	await page.getByRole('button', { name: 'Send confirm link' }).click();
	await expect(page.getByRole('alert')).toHaveText('Check the email address.');
	await page.getByLabel('Email').fill(RECOVERY);
	await page.getByRole('button', { name: 'Send confirm link' }).click();

	// Step 4: alerts.
	await expect(page).toHaveURL('/setup/alerts');
	await expect(page.getByRole('heading', { name: 'Get alerts on this phone' })).toBeVisible();
	const topic = await page.getByLabel('Your topic').inputValue();
	expect(topic).toMatch(/^rocket-[a-z0-9]{12}$/);
	await expectAccessible(page);
	await page.getByRole('button', { name: 'Send a test alert' }).click();
	await expect
		.poll(async () => (await outbox(page)).alerts.filter((a) => a.topic === topic))
		.toEqual([
			{
				topic,
				headers: { Title: 'Test alert', Cache: 'no', Tags: 'rocket' },
				body: 'Rocket Rewards alerts are working.'
			}
		]);
	await page.getByRole('button', { name: 'Finish' }).click();

	await expect(page).toHaveURL('/setup/done');
	await expect(page.getByRole('heading', { name: 'You’re all set!' })).toBeVisible();
	await expectAccessible(page);

	// Setup is closed once it is finished.
	for (const path of ['/setup', '/setup/children', '/setup/pin', '/setup/email', '/setup/alerts']) {
		await page.goto(path);
		await expect(page, path).toHaveURL('/');
	}
});

test('the recovery email is used only after its link is confirmed', async ({ page, browser }) => {
	await signIn(page, { as: 'setup-link', newFamily: true });
	await page.getByLabel('Child 1', { exact: true }).fill('Mia');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByLabel('PIN', { exact: true }).fill('4826');
	await page.getByLabel('Type it again').fill('4826');
	await page.getByRole('button', { name: 'Next' }).click();
	await page.getByLabel('Email').fill('link-test@example.test');
	await page.getByRole('button', { name: 'Send confirm link' }).click();
	await expect(page).toHaveURL('/setup/alerts');

	const mail = (await outbox(page)).emails.filter((e) => e.to === 'link-test@example.test');
	expect(mail).toHaveLength(1);
	expect(mail[0].subject).toBe('Confirm your Rocket Rewards recovery email');
	const link = /(http\S+\/verify-email\?token=\S+)/.exec(mail[0].text)![1];

	// Opened on another device that is not signed in.
	const otherDevice = await browser.newContext();
	const other = await otherDevice.newPage();
	await other.goto(link);
	await expect(other.getByRole('heading', { name: 'Confirm recovery email' })).toBeVisible();
	await expect(other.getByText('Use l•••@example.test for PIN reset codes?')).toBeVisible();
	await expectAccessible(other);
	await other.getByRole('button', { name: 'Confirm' }).click();
	await expect(other.getByRole('status')).toHaveText(
		'Recovery email confirmed. You can close this page.'
	);

	await other.goto(link);
	await expect(other.getByRole('alert')).toHaveText('This link has expired or was already used.');
	await other.goto(`${new URL(link).origin}/verify-email?token=nonsense`);
	await expect(other.getByRole('alert')).toHaveText('This link has expired or was already used.');
	await otherDevice.close();
});

test('two children cannot share a name or a colour', async ({ page }) => {
	await signIn(page, { as: 'setup-same', newFamily: true });
	await page.getByLabel('Child 1', { exact: true }).fill('Mia');
	await page.getByRole('button', { name: 'Add another child' }).click();
	await page.getByLabel('Child 2', { exact: true }).fill('mia');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('alert')).toHaveText('Each child needs their own name.');

	await page.getByLabel('Child 2', { exact: true }).fill('Leo');
	await page
		.getByRole('group', { name: 'Child 2 rocket colour' })
		.getByRole('radio', { name: 'Pink' })
		.check();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('alert')).toHaveText('Each child needs their own colour.');
});

test('at most 4 children', async ({ page }) => {
	await signIn(page, { as: 'setup-four', newFamily: true });
	const add = page.getByRole('button', { name: 'Add another child' });
	for (let i = 0; i < 3; i++) await add.click();
	await expect(page.getByLabel('Child 4', { exact: true })).toBeVisible();
	await expect(add).toHaveCount(0);
});

test('the PIN step needs children first', async ({ page }) => {
	await signIn(page, { as: 'setup-skip', newFamily: true });
	await page.goto('/setup/pin');
	await expect(page).toHaveURL('/setup/children');
});

test('the server refuses setup posts once setup is done', async ({ page }) => {
	await signIn(page);
	const posts: [string, Record<string, string>][] = [
		['/setup/children', { 'name-0': 'Zed', 'colour-0': 'green' }],
		['/setup/pin', { pin: '0000', again: '0000' }],
		['/setup/email', { email: 'someone@example.test' }],
		['/setup/alerts?/test', {}],
		['/setup/alerts?/finish', {}]
	];
	for (const [path, form] of posts) {
		const res = await page.request.post(path, {
			form,
			// Post like a plain browser form, so the answer is a real redirect, not JSON.
			headers: { origin: 'http://localhost:4173', accept: 'text/html' },
			maxRedirects: 0
		});
		expect(res.status(), path).toBe(303);
		expect(['/', '/setup'], path).toContain(res.headers()['location']);
	}
	expect((await outbox(page)).emails.filter((e) => e.to === 'someone@example.test')).toEqual([]);
});
