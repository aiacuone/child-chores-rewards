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

// The rewards library and meters (#26): a grown-up adds, edits and removes
// rewards; each child sees a labelled meter on My rewards.

test('a grown-up adds, edits and removes rewards, and children see their meters', async ({
	page,
	browser
}) => {
	test.setTimeout(90_000);
	await signIn(page, { as: 'rewards-flow' });
	const { mia, ids } = await addChores(page, [{ name: 'Make your bed' }]);
	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	// Mia finishes her only stop: 10 stars and the 20-star bonus.
	await acceptStop(page, 'rewards-flow', mia, ids['Make your bed'], token);

	// A tablet showing Mia's My rewards, to watch it follow.
	const tablet = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(tablet, { as: 'rewards-flow' });
	await tablet.goto(`/trip/${mia}/rewards`);
	await expect(tablet.getByRole('heading', { name: 'My rewards' })).toBeVisible();
	await expect(tablet.getByText('No rewards yet. A grown-up can add some.')).toBeVisible();

	// New reward, as drawn: name, stars, children, planet colour.
	await page.goto('/grown-up/rewards');
	await typePin(page);
	await expect(page.getByRole('heading', { name: 'Rewards', exact: true })).toBeVisible();
	await expect(page.getByText('No rewards yet.')).toBeVisible();
	await page.getByRole('link', { name: 'Add reward' }).click();
	await expect(page.getByRole('heading', { name: 'New reward' })).toBeVisible();
	await page.getByLabel('Reward name').fill('Movie night');
	await page.getByLabel('Stars needed').fill('0');
	await expect(page.getByRole('alert')).toHaveText('Use a whole number from 1 to 1000.');
	await expect(page.getByRole('button', { name: 'Add reward' })).toBeDisabled();
	await page.getByLabel('Stars needed').fill('100');
	await page.getByLabel('Purple').check({ force: true });
	await expectAccessible(page);
	await page.getByRole('button', { name: 'Add reward' }).click();
	await expect(page.getByRole('status')).toHaveText('Movie night added');
	await expect(page.getByRole('link', { name: /Movie night\s*New/ })).toBeVisible();
	// Both children have a labelled meter, with the words "to go".
	const movie = page.getByRole('link', { name: /Movie night/ });
	await expect(movie.getByRole('progressbar', { name: 'Mia’s stars' })).toHaveAttribute(
		'aria-valuetext',
		'70 stars to go'
	);
	await expect(movie.getByRole('progressbar', { name: 'Leo’s stars' })).toHaveAttribute(
		'aria-valuetext',
		'100 stars to go'
	);
	await expectAccessible(page);

	// A second reward for Mia only, cheap enough to claim: shown in words too.
	await page.getByRole('link', { name: 'Add reward' }).click();
	await page.getByLabel('Reward name').fill('Sticker');
	await page.getByLabel('Stars needed').fill('25');
	await page.getByRole('button', { name: 'Leo' }).click();
	await page.getByRole('button', { name: 'Add reward' }).click();
	const sticker = page.getByRole('link', { name: /Sticker/ });
	await expect(sticker).toContainText('Claimable');
	await expect(sticker).toContainText('Ready');
	await expect(sticker).not.toContainText('Leo');
	await expect(sticker.getByRole('progressbar', { name: 'Mia’s stars' })).toHaveAttribute(
		'aria-valuetext',
		'Ready'
	);
	await expectAccessible(page);

	// Mia's My rewards: the ready one first, with its meter and words.
	await expect(tablet.getByRole('list').getByRole('listitem')).toHaveText(
		[/Sticker\s*25\s*stars\s*Ready to claim!/, /Movie night\s*100\s*stars\s*70 stars to go/],
		{ timeout: 10_000 }
	);
	await expect(tablet.getByRole('progressbar', { name: 'Sticker' })).toHaveAttribute(
		'aria-valuetext',
		'Ready to claim'
	);
	await expect(tablet.getByRole('progressbar', { name: 'Movie night' })).toHaveAttribute(
		'aria-valuetext',
		'30 of 100 stars, 70 to go'
	);
	await expectAccessible(tablet);

	// Leo only sees what is for him.
	const { children } = await (
		await page.request.get('/api/grown-up/rewards', { headers: { 'x-grown-up': token } })
	).json();
	const leo = children.find((c: { name: string }) => c.name === 'Leo').id as number;
	await tablet.goto(`/trip/${leo}/rewards`);
	await expect(tablet.getByRole('list').getByRole('listitem')).toHaveText([
		/Movie night\s*100\s*stars\s*100 stars to go/
	]);

	// The star count and "See my rewards" lead there.
	await tablet.goto(`/trip/${mia}`);
	await tablet.getByRole('link', { name: '30 stars' }).click();
	await expect(tablet).toHaveURL(`${BASE}/trip/${mia}/rewards`);
	await tablet.getByRole('link', { name: 'Back' }).click();
	await tablet.getByRole('link', { name: '+20 bonus' }).click();
	await tablet.getByRole('link', { name: 'See my rewards' }).click();
	await expect(tablet).toHaveURL(`${BASE}/trip/${mia}/rewards`);

	// Edit: a cheaper Movie night is ready for Mia, and her tablet follows without a reload.
	await movie.click();
	await expect(page.getByRole('heading', { name: 'Edit reward' })).toBeVisible();
	await expect(page.getByLabel('Reward name')).toHaveValue('Movie night');
	await expect(page.getByLabel('Stars needed')).toHaveValue('100');
	await page.getByLabel('Stars needed').fill('30');
	await page.getByRole('button', { name: 'Save changes' }).click();
	await expect(page.getByRole('status')).toHaveText('Movie night saved');
	await expect(page.getByRole('link', { name: /Movie night/ })).toContainText('Claimable');
	await expect(tablet.getByRole('list').getByRole('listitem')).toHaveText(
		[/Sticker\s*25\s*stars\s*Ready to claim!/, /Movie night\s*30\s*stars\s*Ready to claim!/],
		{ timeout: 10_000 }
	);

	// Remove asks first, and keeps the stars.
	await page.getByRole('link', { name: /Sticker/ }).click();
	await page.getByRole('button', { name: 'Remove reward' }).click();
	await expect(page.getByRole('heading', { name: 'Remove Sticker?' })).toBeVisible();
	await page.getByRole('button', { name: 'Keep it' }).click();
	await expect(page.getByRole('heading', { name: 'Edit reward' })).toBeVisible();
	await page.getByRole('button', { name: 'Remove reward' }).click();
	await page.getByRole('button', { name: 'Remove reward' }).last().click();
	await expect(page).toHaveURL(`${BASE}/grown-up/rewards`);
	await expect(page.getByRole('link', { name: /Sticker/ })).toHaveCount(0);
	await expect(tablet.getByText('Sticker')).toHaveCount(0, { timeout: 10_000 });
	await expect(tablet.getByText('30 stars', { exact: true }).first()).toBeVisible();
	await tablet.context().close();
});

test('rewards are only for the signed-in family and need grown-up mode', async ({
	page,
	browser
}) => {
	await signIn(page, { as: 'rewards-ours' });
	const unlock = async (p: typeof page) =>
		(await (await p.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })).json())
			.token as string;
	const ours = await unlock(page);
	const json = (token?: string) => ({
		origin: BASE,
		'content-type': 'application/json',
		...(token ? { 'x-grown-up': token } : {})
	});
	const { children } = await (
		await page.request.get('/api/grown-up/rewards', { headers: json(ours) })
	).json();
	const reward = { name: 'Pizza night', cost: 200, colour: 'tan', childIds: [children[0].id] };
	const made = await page.request.post('/api/grown-up/rewards', {
		headers: json(ours),
		data: reward
	});
	expect(made.status()).toBe(201);
	const { id } = await made.json();

	// Without grown-up mode: refused.
	expect((await page.request.get('/api/grown-up/rewards', { headers: json() })).status()).toBe(401);
	expect(
		(await page.request.post('/api/grown-up/rewards', { headers: json(), data: reward })).status()
	).toBe(401);

	// Bad input is refused, not fixed.
	for (const bad of [
		{ ...reward, cost: 0 },
		{ ...reward, cost: 1001 },
		{ ...reward, name: ' padded' },
		{ ...reward, colour: 'red' },
		{ ...reward, childIds: 'all' }
	])
		expect(
			(
				await page.request.post('/api/grown-up/rewards', { headers: json(ours), data: bad })
			).status()
		).toBe(400);

	// Another family reads nothing, changes nothing, and cannot use our children.
	const other = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(other, { as: 'rewards-theirs' });
	const theirs = await unlock(other);
	const url = `/api/grown-up/rewards/${id}`;
	expect((await other.request.get(url, { headers: json(theirs) })).status()).toBe(404);
	expect(
		(
			await other.request.put(url, { headers: json(theirs), data: { ...reward, childIds: [] } })
		).status()
	).toBe(404);
	expect((await other.request.delete(url, { headers: json(theirs) })).status()).toBe(404);
	expect(
		(
			await other.request.post('/api/grown-up/rewards', { headers: json(theirs), data: reward })
		).status()
	).toBe(400);
	const listed = await (
		await other.request.get('/api/grown-up/rewards', { headers: json(theirs) })
	).json();
	expect(listed.rewards).toEqual([]);
	// Their devices cannot open our child's My rewards.
	expect((await other.request.get(`/trip/${children[0].id}/rewards`)).status()).toBe(404);
	// It is still there for us.
	expect((await page.request.get(url, { headers: json(ours) })).status()).toBe(200);
	await other.context().close();
});
