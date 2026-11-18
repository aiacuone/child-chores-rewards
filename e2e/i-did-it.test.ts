import { expect, test } from '@playwright/test';
import { BASE, addChores, expectAccessible, signIn } from './helpers';

// "I did it!" and live updates (#23): the child sends a stop to a grown-up,
// confirms who they are, can undo it, and another device shows the change
// within a few seconds.

type SentAlert = { topic: string; headers: Record<string, string>; body: string };

test('a child taps I did it, confirms, undoes, and another device follows', async ({
	page,
	browser
}) => {
	await signIn(page, { as: 'did-it' });
	await addChores(page, [{ name: 'Make your bed' }, { name: 'Set the table' }]);
	const alertsBefore = (await (await page.request.get('/test/outbox?as=did-it')).json()).alerts
		.length;

	// A second device in the same family, watching Mia's trip.
	const tablet = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(tablet, { as: 'did-it' });
	await tablet.goto('/');
	await tablet.getByRole('link', { name: /^Mia/ }).click();
	const tabletStops = tablet.getByRole('list', { name: 'Today’s stops' }).getByRole('listitem');
	await expect(tabletStops).toHaveText([/Make your bed\s*Up next/, /Set the table\s*\+10 stars/]);

	// Set the table is not Up next, so it moves to the front.
	await page.goto('/');
	await page.getByRole('link', { name: /^Mia/ }).click();
	await page.getByRole('link', { name: /Set the table/ }).click();
	await page.getByRole('link', { name: 'I did it!' }).click();
	await expect(page.getByRole('heading', { name: 'Are you Mia?' })).toBeVisible();
	await expect(page.getByText('Only Mia taps for Mia’s chores.')).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('button', { name: 'Yes, I’m Mia' }).click();

	await expect(page.getByRole('status')).toHaveText(/Set the table moved to the front!\s*Undo/);
	const stops = page.getByRole('list', { name: 'Today’s stops' }).getByRole('listitem');
	await expect(stops).toHaveText([/Set the table\s*Grown-up checking/, /Make your bed\s*Up next/]);
	await expectAccessible(page);

	// The other device catches up without a reload.
	await expect(tabletStops).toHaveText(
		[/Set the table\s*Grown-up checking/, /Make your bed\s*Up next/],
		{ timeout: 10_000 }
	);

	// Every grown-up got one alert, with no names or details.
	const { alerts } = (await (await page.request.get('/test/outbox?as=did-it')).json()) as {
		alerts: SentAlert[];
	};
	const sent = alerts
		.slice(alertsBefore)
		.filter((a) => a.headers.Title === 'A chore is ready to check');
	expect(sent).toHaveLength(1);
	expect(sent[0].body).toBe('A chore is waiting. Open Rocket Rewards to take a look.');
	expect(sent[0].headers.Cache).toBe('no');

	// Undo puts it back, here and on the other device.
	await page.getByRole('button', { name: 'Undo' }).click();
	await expect(page.getByRole('status')).toHaveCount(0);
	await expect(stops).toHaveText([/Make your bed\s*Up next/, /Set the table\s*\+10 stars/]);
	await expect(tabletStops).toHaveText([/Make your bed\s*Up next/, /Set the table\s*\+10 stars/], {
		timeout: 10_000
	});

	// Up next stays where it is, so the message is the plain one.
	await page.getByRole('link', { name: /Make your bed/ }).click();
	await page.getByRole('link', { name: 'I did it!' }).click();
	await page.getByRole('button', { name: 'Yes, I’m Mia' }).click();
	await expect(page.getByRole('status')).toHaveText(/Sent! A grown-up will check it\.\s*Undo/);

	await tablet.context().close();
});

test('“No, that’s not me” goes back to Who’s flying', async ({ page }) => {
	await signIn(page, { as: 'not-me' });
	const { mia, ids } = await addChores(page, [{ name: 'Make your bed' }]);
	await page.goto(`/trip/${mia}/stop/${ids['Make your bed']}/confirm`);
	await page.getByRole('link', { name: 'No, that’s not me' }).click();
	await expect(page).toHaveURL(`${BASE}/`);
	await expect(page.getByRole('heading', { name: /Who’s flying/ })).toBeVisible();
});

test('a done or waiting stop cannot be confirmed again', async ({ page }) => {
	await signIn(page, { as: 'confirm-twice' });
	const { mia, ids } = await addChores(page, [{ name: 'Make your bed' }]);
	const confirm = `/trip/${mia}/stop/${ids['Make your bed']}/confirm`;
	await page.goto(confirm);
	await page.getByRole('button', { name: 'Yes, I’m Mia' }).click();
	await expect(page.getByRole('status')).toBeVisible();
	await page.goto(confirm);
	await expect(page).toHaveURL(`${BASE}/trip/${mia}`);
	const again = await page.request.post(confirm, {
		headers: { origin: BASE, accept: 'text/html' },
		form: {},
		maxRedirects: 0
	});
	expect(again.status()).toBe(303);
	expect(again.headers().location).toBe(`/trip/${mia}`);
});
