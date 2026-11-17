import { expect, test, type Page } from '@playwright/test';
import { TEST_PIN, expectAccessible, signIn } from './helpers';

// The chores library (#20): add, edit, assign, filter and remove chores.

async function grownUp(page: Page, as: string) {
	await signIn(page, { as });
	await page.getByRole('link', { name: 'I’m a grown-up' }).click();
	for (const d of TEST_PIN) await page.getByRole('button', { name: d, exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Mission control' })).toBeVisible();
	await page.getByRole('link', { name: 'Chores' }).click();
	await expect(page.getByRole('heading', { name: 'Chores', exact: true })).toBeVisible();
}

test('add a chore, then edit who does it and its stars', async ({ page }) => {
	await grownUp(page, 'chores-flow');
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Add chore' }).click();
	await expect(page.getByRole('heading', { name: 'New chore' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Add chore' })).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Mia' })).toHaveAttribute('aria-pressed', 'true');
	await expectAccessible(page);

	await page.getByLabel('Chore name').fill('Water the plants');
	await page.getByRole('radio', { name: 'Plate' }).check();
	await page.getByRole('button', { name: 'More stars' }).click();
	await page.getByRole('button', { name: 'Add chore' }).click();

	await expect(page).toHaveURL(/\/grown-up\/chores\?added=\d+$/);
	await expect(page.getByRole('status')).toHaveText('Water the plants added');
	const row = page.getByRole('link', { name: /Water the plants/ });
	await expect(row).toContainText('Every day · Mia, Leo');
	await expect(row).toContainText('New');
	await expect(row).toContainText('+15');

	await row.click();
	await expect(page.getByRole('heading', { name: 'Water the plants' })).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Edit chore' }).click();
	await expect(page.getByLabel('Chore name')).toHaveValue('Water the plants');
	await page.getByRole('button', { name: 'Mia' }).click();
	await page.getByRole('button', { name: 'Fewer stars' }).click();
	await page.getByRole('button', { name: 'Fewer stars' }).click();
	await page.getByRole('button', { name: 'Save changes' }).click();

	await expect(page.getByRole('status')).toHaveText('Saved');
	await expect(page.getByText('Leo', { exact: true })).toBeVisible();
	await expect(page.getByText('+5', { exact: true })).toBeVisible();
});

test('the chips filter by child and by nobody', async ({ page }) => {
	await grownUp(page, 'chores-chips');
	for (const [name, kids] of [
		['Make your bed', ['Mia', 'Leo']],
		['Feed the dog', ['Mia']],
		['Wash the car', []]
	] as const) {
		await page.getByRole('link', { name: 'Add chore' }).click();
		await page.getByLabel('Chore name').fill(name);
		for (const kid of ['Mia', 'Leo'])
			if (!(kids as readonly string[]).includes(kid))
				await page.getByRole('button', { name: kid }).click();
		await page.getByRole('button', { name: 'Add chore' }).click();
		await expect(page.getByRole('status')).toHaveText(`${name} added`);
	}
	const rows = page.getByRole('list').getByRole('link');
	await expect(rows).toHaveCount(3);
	await expect(page.getByRole('link', { name: /Wash the car/ })).toContainText('Nobody yet');

	await page.getByRole('link', { name: 'Leo', exact: true }).click();
	await expect(rows).toHaveCount(1);
	await expect(rows).toContainText('Make your bed');
	await page.getByRole('link', { name: 'Nobody', exact: true }).click();
	await expect(rows).toHaveCount(1);
	await expect(rows).toContainText('Wash the car');
	await page.getByRole('link', { name: 'All', exact: true }).click();
	await expect(rows).toHaveCount(3);
});

test('removing a chore asks first', async ({ page }) => {
	await grownUp(page, 'chores-remove');
	await page.getByRole('link', { name: 'Add chore' }).click();
	await page.getByLabel('Chore name').fill('Tidy the toy box');
	await page.getByRole('button', { name: 'Add chore' }).click();
	await page.getByRole('link', { name: /Tidy the toy box/ }).click();

	await page.getByRole('button', { name: 'Remove chore' }).click();
	const card = page.getByRole('alertdialog', { name: 'Remove Tidy the toy box?' });
	await expect(card).toContainText('It goes from every child’s trip. Stars already earned stay.');
	await expect(page.getByRole('button', { name: 'Keep it' })).toBeFocused();
	await expectAccessible(page);
	await page.getByRole('button', { name: 'Keep it' }).click();
	await expect(card).toHaveCount(0);

	await page.getByRole('button', { name: 'Remove chore' }).click();
	await card.getByRole('button', { name: 'Remove chore' }).click();
	await expect(page).toHaveURL('/grown-up/chores');
	await expect(page.getByRole('link', { name: /Tidy the toy box/ })).toHaveCount(0);
});

test('the chore API needs grown-up mode and keeps families apart', async ({ page, browser }) => {
	const ORIGIN = { origin: 'http://localhost:4173', 'content-type': 'application/json' };
	await signIn(page, { as: 'chores-a' });
	const unlock = async (p: Page) =>
		(await (await p.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })).json())
			.token as string;

	expect((await page.request.get('/api/grown-up/chores')).status()).toBe(401);
	const token = await unlock(page);
	const list = await (
		await page.request.get('/api/grown-up/chores', { headers: { 'x-grown-up': token } })
	).json();
	const created = await page.request.post('/api/grown-up/chores', {
		headers: { ...ORIGIN, 'x-grown-up': token },
		data: { name: 'Feed the cat', icon: 'paw', stars: 10, childIds: [list.children[0].id] }
	});
	expect(created.status()).toBe(201);
	const { id } = await created.json();

	const other = await (await browser.newContext({ baseURL: 'http://localhost:4173' })).newPage();
	await signIn(other, { as: 'chores-b' });
	const theirs = await unlock(other);
	const h = { ...ORIGIN, 'x-grown-up': theirs };
	expect((await other.request.get(`/api/grown-up/chores/${id}`, { headers: h })).status()).toBe(
		404
	);
	expect(
		(
			await other.request.put(`/api/grown-up/chores/${id}`, {
				headers: h,
				data: { name: 'Mine now', icon: 'paw', stars: 10, childIds: [] }
			})
		).status()
	).toBe(404);
	expect((await other.request.delete(`/api/grown-up/chores/${id}`, { headers: h })).status()).toBe(
		404
	);
	// Assigning family A's child from family B is refused.
	expect(
		(
			await other.request.post('/api/grown-up/chores', {
				headers: h,
				data: { name: 'Sneaky', icon: 'paw', stars: 10, childIds: [list.children[0].id] }
			})
		).status()
	).toBe(400);
	await other.context().close();

	const still = await page.request.get(`/api/grown-up/chores/${id}`, {
		headers: { 'x-grown-up': token }
	});
	expect((await still.json()).name).toBe('Feed the cat');
});
