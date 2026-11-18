// Settings, Children: add, edit, remove, and the picture passcode that guards a
// child's trip on the server.
import { expect, test, type Page } from '@playwright/test';
import { BASE, TEST_PIN, expectAccessible, signIn, typePin } from './helpers';

const row = (page: Page, name: string | RegExp) => page.getByRole('link', { name });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function openChildren(page: Page) {
	await page.goto('/grown-up/settings');
	await typePin(page);
	await row(page, /Children\s*Mia/).click();
	await expect(page.getByRole('heading', { name: 'Children', exact: true })).toBeVisible();
}

const tapAll = async (page: Page, pictures: string[]) => {
	for (const p of pictures) await button(page, p).click();
};

async function childId(page: Page, name: string) {
	await page.goto('/');
	const href = await row(page, new RegExp(name)).getAttribute('href');
	return Number(href!.split('/').pop());
}

/** Go to Who's flying and wait until it has closed this device's open trips. */
async function backToWhosFlying(page: Page) {
	const closed = page.waitForResponse((r) => r.url().endsWith('/api/passcode/close'));
	await page.goto('/');
	await closed;
}

test('add, edit and remove children', async ({ page }) => {
	await signIn(page, { as: 'children-edit' });
	const leo = await childId(page, 'Leo');
	await openChildren(page);
	await expect(row(page, /Mia.*Edit/)).toBeVisible();
	await expectAccessible(page);

	await row(page, 'Add a child').click();
	await expect(page.getByRole('heading', { name: 'Add a child' })).toBeVisible();
	await expect(page.getByRole('radio', { name: 'Pink, used by another child' })).toBeDisabled();
	await expect(page.getByRole('radio', { name: 'Purple' })).toBeChecked();
	await expectAccessible(page);
	await page.getByLabel('Name').fill('mia');
	await button(page, 'Save').click();
	await expect(page.getByRole('alert')).toHaveText('Each child needs their own name.');
	await page.getByLabel('Name').fill('Ava');
	await button(page, 'Save').click();
	await expect(row(page, /Ava.*Edit/)).toBeVisible();

	await row(page, /Ava.*Edit/).click();
	await expect(page.getByLabel('Name')).toHaveValue('Ava');
	await page.getByLabel('Name').fill('Ivy');
	await page.getByRole('radio', { name: 'Green', exact: true }).check({ force: true });
	await expectAccessible(page);
	await button(page, 'Save').click();
	await expect(row(page, /Ivy.*Edit/)).toBeVisible();

	// Removing says what goes, and Cancel keeps the child.
	await row(page, /Leo.*Edit/).click();
	await row(page, 'Remove Leo').click();
	await expect(page.getByRole('heading', { name: 'Remove Leo?' })).toBeVisible();
	await expect(
		page.getByText('Leo’s trip, 0 stars and rank will be deleted. The chores stay in the list.')
	).toBeVisible();
	await expectAccessible(page);
	await row(page, 'Cancel').click();
	await row(page, 'Remove Leo').click();
	await button(page, 'Yes, remove Leo').click();
	await expect(page.getByRole('status')).toHaveText('Leo was removed');
	await expect(row(page, /Leo.*Edit/)).toHaveCount(0);
	await expectAccessible(page);

	// The last child has no Remove button, and the server refuses too.
	await row(page, /Ivy.*Edit/).click();
	await row(page, 'Remove Ivy').click();
	await button(page, 'Yes, remove Ivy').click();
	await expect(page.getByRole('status')).toHaveText('Ivy was removed');
	await row(page, /Mia.*Edit/).click();
	await expect(page.getByLabel('Name')).toHaveValue('Mia');
	await expect(row(page, 'Remove Mia')).toHaveCount(0);

	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const mia = await childId(page, 'Mia');
	const last = await page.request.delete(`/api/grown-up/children/${mia}`, {
		headers: { origin: BASE, 'x-grown-up': token }
	});
	expect(last.status()).toBe(409);

	await expect(row(page, /Leo/)).toHaveCount(0);
	expect((await page.goto(`/trip/${leo}`))!.status()).toBe(404);
});

test('a passcode guards the trip until the right pictures are tapped', async ({ page }) => {
	test.setTimeout(90_000);
	await signIn(page, { as: 'children-passcode' });
	const mia = await childId(page, 'Mia');
	await openChildren(page);
	await row(page, /Mia.*Edit/).click();
	await row(page, /Picture passcode\s*Off · tap to set up/).click();
	await expect(page.getByRole('heading', { name: 'Mia’s pictures' })).toBeVisible();
	await expect(page.getByText('Pick the first one.')).toBeVisible();
	await expect(button(page, 'Save passcode')).toBeDisabled();
	await expect(button(page, 'Turn off passcode')).toHaveCount(0);
	await expectAccessible(page);
	await tapAll(page, ['rocket', 'star', 'car']);
	await button(page, 'car').click(); // takes it back
	await expect(page.getByText('Pick the third one.')).toBeVisible();
	await button(page, 'paw').click();
	await button(page, 'Save passcode').click();
	await expect(row(page, /Picture passcode\s*On · tap to change/)).toBeVisible();

	// Who's flying now asks for the pictures.
	await backToWhosFlying(page);
	await row(page, /Mia/).click();
	await expect(page).toHaveURL(`/passcode/${mia}`);
	await expect(page.getByRole('heading', { name: 'Hi Mia!' })).toBeVisible();
	await expectAccessible(page);

	// Nothing on the trip can be reached around the screen.
	for (const path of [
		`/trip/${mia}`,
		`/trip/${mia}/rewards`,
		`/trip/%3${String(mia)[0]}${String(mia).slice(1)}`
	]) {
		await page.goto(path);
		await expect(page).toHaveURL(`/passcode/${mia}`);
	}
	const action = await page.request.post(`/trip/${mia}/stop/1/confirm`, {
		headers: {
			origin: BASE,
			accept: 'text/html',
			'content-type': 'application/x-www-form-urlencoded'
		},
		data: 'x=1',
		maxRedirects: 0
	});
	expect(action.status()).toBe(303);
	expect(action.headers().location).toBe(`/passcode/${mia}`);
	const data = await page.request.get(`/trip/${mia}/__data.json`);
	expect(await data.text()).toContain(`/passcode/${mia}`);

	// Wrong pictures, then the right ones in order.
	await tapAll(page, ['paw', 'star', 'rocket']);
	await expect(page.getByRole('alert')).toHaveText('Those aren’t your pictures. Try again.');
	await expect(page.getByRole('img', { name: '0 of 3 pictures tapped' })).toBeVisible();
	await tapAll(page, ['rocket', 'star', 'paw']);
	await expect(page).toHaveURL(`/trip/${mia}`);

	// Leo has no passcode, and going back to Who's flying closes Mia's trip.
	await backToWhosFlying(page);
	await row(page, /Leo/).click();
	await expect(page).toHaveURL(/\/trip\/\d+$/);
	await backToWhosFlying(page);
	await page.goto(`/trip/${mia}`);
	await expect(page).toHaveURL(`/passcode/${mia}`);

	// Five wrong tries in a row mean a wait, which a reload does not end.
	for (let i = 0; i < 5; i++) {
		await tapAll(page, ['gift', 'car', 'book']);
		if (i < 4)
			await expect(page.getByRole('img', { name: '0 of 3 pictures tapped' })).toBeVisible();
	}
	await expect(page.getByRole('alert')).toContainText(/Wait \d+ seconds?, then try again\./);
	await expect(button(page, 'rocket')).toBeDisabled();
	await page.reload();
	await expect(button(page, 'rocket')).toBeDisabled();

	// Turning it off opens the trip straight from Who's flying.
	await openChildren(page);
	await row(page, /Mia.*Edit/).click();
	await row(page, /Picture passcode\s*On/).click();
	await button(page, 'Turn off passcode').click();
	await expect(row(page, /Picture passcode\s*Off/)).toBeVisible();
	await page.goto('/');
	await row(page, /Mia/).click();
	await expect(page).toHaveURL(`/trip/${mia}`);
});

test('another family cannot reach these children', async ({ page, browser }) => {
	await signIn(page, { as: 'children-ours' });
	const mia = await childId(page, 'Mia');
	const context = await browser.newContext({ baseURL: BASE });
	const other = await context.newPage();
	await signIn(other, { as: 'children-theirs' });
	const { token } = await (
		await other.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const headers = { origin: BASE, 'x-grown-up': token };

	expect((await other.request.get(`/api/grown-up/children/${mia}`, { headers })).status()).toBe(
		404
	);
	expect((await other.request.delete(`/api/grown-up/children/${mia}`, { headers })).status()).toBe(
		404
	);
	const set = await other.request.put(`/api/grown-up/children/${mia}/passcode`, {
		headers,
		data: { pictures: ['rocket', 'star', 'paw'] }
	});
	expect(set.status()).toBe(404);
	const tryIt = await other.request.post(`/api/passcode/${mia}`, {
		headers: { origin: BASE },
		data: { pictures: ['rocket', 'star', 'paw'] }
	});
	expect(tryIt.status()).toBe(404);
	expect((await other.goto(`/passcode/${mia}`))!.status()).toBe(404);

	// Without grown-up mode the children API is closed, even to the family.
	expect((await page.request.get('/api/grown-up/children')).status()).toBe(401);
	await context.close();
});
