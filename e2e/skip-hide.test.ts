import { expect, test } from '@playwright/test';
import { BASE, TEST_PIN, addChores, expectAccessible, signIn, typePin } from './helpers';
import { addDays, choreDay } from '../src/lib/repeat';
import { backOn } from '../src/lib/skip';

// Skipping and hiding a chore (#29). Both take it off the children's screens and
// leave it on the grown-ups' list, with a way back.

test('a grown-up skips, hides and turns a chore back on', async ({ page, browser }) => {
	test.setTimeout(120_000);
	await signIn(page, { as: 'skip-flow' });
	const { mia } = await addChores(page, [{ name: 'Tidy the toy box' }, { name: 'Make your bed' }]);
	const tablet = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(tablet, { as: 'skip-flow' });
	const stop = tablet.getByRole('link', { name: /Tidy the toy box/ });
	const onTrip = async (visible: boolean) => {
		await tablet.goto(`/trip/${mia}`);
		await expect(tablet.getByRole('link', { name: /Make your bed/ })).toBeVisible();
		await expect(stop).toHaveCount(visible ? 1 : 0);
	};
	await onTrip(true);

	const today = choreDay(new Date());
	await page.goto('/grown-up/chores');
	await typePin(page);
	const row = page.getByRole('link', { name: /Tidy the toy box/ });
	await row.click();
	await expect(page.getByText('Mia: up next').or(page.getByText('Mia: to do'))).toBeVisible();
	await expectAccessible(page);

	// Today only.
	await page.getByRole('link', { name: 'Skip…' }).click();
	await expect(page.getByRole('heading', { name: 'Skip for how long?' })).toBeVisible();
	await expect(
		page.getByText('Tidy the toy box won’t appear on Mia’s trip for the days you pick.')
	).toBeVisible();
	await expect(
		page.getByRole('button', { name: `3 days Back on ${backOn(addDays(today, 3), today)}` })
	).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('button', { name: /^Today only/ }).click();
	await expect(page.getByRole('status')).toHaveText('Tidy the toy box skipped for today');
	await expect(row).toContainText('Skipped today');
	await onTrip(false);

	// The chore screen offers the way back, and it works at once.
	await row.click();
	await expect(page.getByText('Skipped · back tomorrow')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Skip…' })).toHaveCount(0);
	await page.getByRole('button', { name: 'Turn back on' }).click();
	await expect(page.getByRole('link', { name: 'Skip…' })).toBeVisible();
	await onTrip(true);

	// 3 days.
	await page.getByRole('link', { name: 'Skip…' }).click();
	await page.getByRole('button', { name: /^3 days/ }).click();
	await expect(page.getByRole('status')).toHaveText(
		`Tidy the toy box skipped for 3 days. Back on ${backOn(addDays(today, 3), today)}`
	);
	await onTrip(false);

	// A picked date.
	await row.click();
	await page.getByRole('button', { name: 'Turn back on' }).click();
	await page.getByRole('link', { name: 'Skip…' }).click();
	await page.getByRole('button', { name: /^Pick a date/ }).click();
	await expect(page.getByRole('button', { name: 'Skip until this date' })).toBeDisabled();
	await page.getByLabel('Comes back on').fill(addDays(today, 10));
	await expectAccessible(page);
	await page.getByRole('button', { name: 'Skip until this date' }).click();
	await expect(page.getByRole('status')).toContainText('skipped for 10 days');

	// Until turned back on.
	await row.click();
	await page.getByRole('button', { name: 'Turn back on' }).click();
	await page.getByRole('link', { name: 'Skip…' }).click();
	await page.getByRole('button', { name: /^Until I turn it back on/ }).click();
	await expect(page.getByRole('status')).toHaveText(
		'Tidy the toy box skipped until you turn it back on'
	);
	await row.click();
	await page.getByRole('button', { name: 'Turn back on' }).click();
	await onTrip(true);

	// Hide: gone from the trip, listed under Hidden, and back with Unhide.
	await page.getByRole('button', { name: 'Hide' }).click();
	await expect(page).toHaveURL(/who=hidden/);
	await expect(page.getByRole('status')).toHaveText('Tidy the toy box is hidden from children');
	await expect(page.getByRole('link', { name: 'Hidden', exact: true })).toHaveAttribute(
		'aria-current',
		'true'
	);
	await expect(row).toContainText('Hidden');
	await expect(page.getByRole('link', { name: /Make your bed/ })).toHaveCount(0);
	await expectAccessible(page);
	await onTrip(false);
	await tablet.goto(`/trip/${mia}/coming-up`);
	await expect(tablet.getByText('Tidy the toy box')).toHaveCount(0);
	await row.click();
	await expect(page.getByText('Hidden from children')).toBeVisible();
	await page.getByRole('button', { name: 'Unhide' }).click();
	await expect(page.getByRole('button', { name: 'Hide', exact: true })).toBeVisible();
	await onTrip(true);
});

test('only this family’s grown-ups can skip or hide', async ({ page, browser }) => {
	await signIn(page, { as: 'skip-ours' });
	const { ids } = await addChores(page, [{ name: 'Tidy the toy box' }]);
	const id = ids['Tidy the toy box'];
	const headers = { origin: BASE, 'content-type': 'application/json' };

	// No grown-up token: refused.
	const noToken = await page.request.post(`/api/grown-up/chores/${id}`, {
		headers,
		data: { action: 'hide' }
	});
	expect(noToken.status()).toBe(401);

	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const ours = { ...headers, 'x-grown-up': token };
	for (const data of [
		{ action: 'skip', length: '9' },
		{ action: 'skipUntil', date: 'tomorrow' },
		{ action: 'skipUntil', date: choreDay(new Date()) }
	])
		expect(
			(await page.request.post(`/api/grown-up/chores/${id}`, { headers: ours, data })).status()
		).toBe(400);

	// Another family: not found, and nothing changes.
	const other = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(other, { as: 'skip-theirs' });
	const theirs = await (
		await other.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const res = await other.request.post(`/api/grown-up/chores/${id}`, {
		headers: { ...headers, 'x-grown-up': theirs.token },
		data: { action: 'hide' }
	});
	expect(res.status()).toBe(404);
	const mine = await (
		await page.request.get(`/api/grown-up/chores/${id}`, { headers: ours })
	).json();
	expect(mine).toMatchObject({ hidden: false, skip: null });
});
