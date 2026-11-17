import { expect, test } from '@playwright/test';
import { BASE, addChores, expectAccessible, signIn } from './helpers';
import { WEEKDAYS, addDays, choreDay, weekday } from '../src/lib/repeat';

// A child's trip (#22): today's stops in order, the count, a stop, Coming up.

test('a child sees today’s stops in order, opens one, and sees what is coming up', async ({
	page
}) => {
	await signIn(page, { as: 'trip-flow' });
	const today = choreDay(new Date());
	const inTwoDays = addDays(today, 2);
	const { mia, ids } = await addChores(page, [
		{ name: 'Make your bed' },
		{ name: 'Feed Biscuit the dog' },
		{
			name: 'Tidy the toy box',
			expectations: 'Put every toy back in the box and push it under your bed.'
		},
		{ name: 'Read for 20 minutes' },
		{ name: 'Set the table' },
		{ name: 'Take out the recycling', repeat: { kind: 'weekly', days: [weekday(inTwoDays)] } }
	]);
	for (const [name, status] of [
		['Make your bed', 'completed'],
		['Feed Biscuit the dog', 'waiting']
	])
		expect(
			(
				await page.request.get(
					`/test/chore-status?as=trip-flow&chore=${ids[name]}&child=${mia}&status=${status}`
				)
			).status()
		).toBe(204);

	await page.goto('/');
	await page.getByRole('link', { name: /^Mia/ }).click();
	await expect(page.getByRole('heading', { name: 'Mia’s space trip' })).toBeVisible();
	await expect(page.getByText('2 of 5 stops · 3 more for +20 bonus stars')).toBeVisible();
	const stops = page.getByRole('list', { name: 'Today’s stops' }).getByRole('listitem');
	await expect(stops).toHaveText([
		/Make your bed\s*Done!/,
		/Feed Biscuit the dog\s*Grown-up checking/,
		/Tidy the toy box\s*Up next · \+10 stars/,
		/Read for 20 minutes\s*\+10 stars/,
		/Set the table\s*\+10 stars/
	]);
	// Finished stops do not open; every unfinished one does.
	await expect(stops.nth(0).getByRole('link')).toHaveCount(0);
	await expect(stops.nth(1).getByRole('link')).toHaveCount(0);
	for (const i of [2, 3, 4]) await expect(stops.nth(i).getByRole('link')).toHaveCount(1);
	await expectAccessible(page);

	await stops.nth(2).getByRole('link').click();
	await expect(page.getByRole('heading', { name: 'Tidy the toy box' })).toBeVisible();
	await expect(page.getByText('Do it any time today')).toBeVisible();
	await expect(
		page.getByText('Put every toy back in the box and push it under your bed.')
	).toBeVisible();
	await expect(page.getByText('+10 stars')).toBeVisible();
	await expect(page.getByText('Every day')).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Back to my trip' }).click();

	await page.getByRole('link', { name: 'Coming up · 1' }).click();
	await expect(page.getByRole('heading', { name: 'Coming up' })).toBeVisible();
	await expect(page.getByRole('listitem')).toHaveText([
		new RegExp(`Take out the recycling\\s*\\+10 stars\\s*${WEEKDAYS[weekday(inTwoDays)].long}`)
	]);
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Back to my trip' }).click();
	await expect(page).toHaveURL(`/trip/${mia}`);

	// A finished stop's address goes back to the trip.
	await page.goto(`/trip/${mia}/stop/${ids['Make your bed']}`);
	await expect(page).toHaveURL(`/trip/${mia}`);
});

test('before anything is finished the trip says to do them in any order', async ({ page }) => {
	await signIn(page, { as: 'trip-open' });
	await addChores(page, [{ name: 'Make your bed' }, { name: 'Set the table' }]);
	await page.goto('/');
	await page.getByRole('link', { name: /^Mia/ }).click();
	await expect(page.getByText('2 stops today · do them in any order!')).toBeVisible();
	await expect(page.getByText('Up next · +10 stars')).toHaveCount(1);
	await expect(page.getByRole('link', { name: /Coming up/ })).toHaveCount(0);
});

test('another family cannot open a child’s trip or stop', async ({ page, browser }) => {
	await signIn(page, { as: 'trip-ours' });
	const { mia, ids } = await addChores(page, [{ name: 'Make your bed' }]);

	const other = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(other, { as: 'trip-theirs' });
	for (const path of [
		`/trip/${mia}`,
		`/trip/${mia}/stop/${ids['Make your bed']}`,
		`/trip/${mia}/coming-up`
	]) {
		const res = await other.goto(path);
		expect(res?.status(), path).toBe(404);
	}
	await other.context().close();
});
