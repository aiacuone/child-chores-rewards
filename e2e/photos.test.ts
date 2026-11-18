// A child's rocket photo, from Who's flying to every device in the family.
import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { BASE, TEST_PIN, expectAccessible, signIn, typePin } from './helpers';

const photoFile = async () => ({
	name: 'me.png',
	mimeType: 'image/png',
	buffer: await sharp({
		create: { width: 800, height: 600, channels: 3, background: '#d9734e' }
	})
		.png()
		.toBuffer()
});
const windowPhoto = (page: Page) => page.locator('image[data-part="photo"]');
const rocketLink = (page: Page, name: string) =>
	page.getByRole('link', { name: `Change ${name}’s rocket photo` });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function childId(page: Page, name: string) {
	await page.goto('/');
	const href = await page.getByRole('link', { name: new RegExp(`^${name}`) }).getAttribute('href');
	return Number(href!.split('/').pop());
}

async function grownUpHeaders(page: Page) {
	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	return { origin: BASE, 'x-grown-up': token };
}

async function addPhoto(page: Page) {
	await page.locator('input[aria-label="Pick a photo"]').setInputFiles(await photoFile());
	await expect(page.getByRole('heading', { name: 'Move and zoom' })).toBeVisible();
}

const upload = (page: Page, id: number, type: string, data: Buffer) =>
	page.request.put(`/api/rocket/${id}/photo`, {
		headers: { origin: BASE, 'content-type': type },
		data
	});

test('a child adds a photo and every device shows it', async ({ page, browser }) => {
	await signIn(page, { as: 'photo-flow' });
	const mia = await childId(page, 'Mia');
	await expect(windowPhoto(page)).toHaveCount(0);
	await rocketLink(page, 'Mia').click();
	await expect(page).toHaveURL(`/rocket/${mia}`);
	await expect(page.getByRole('heading', { name: 'Put your face in the window!' })).toBeVisible();
	await expect(page.getByText('Only your family can see it.')).toBeVisible();
	await expectAccessible(page);

	await addPhoto(page);
	await expectAccessible(page);
	await page.getByRole('slider', { name: 'Zoom' }).fill('1.5');
	await page.getByRole('img', { name: /^Your photo/ }).press('ArrowLeft');
	await button(page, 'Try again').click();
	await addPhoto(page);
	await button(page, 'Looks good!').click();
	await expect(page.getByRole('heading', { name: 'Looking good, Mia!' })).toBeVisible();
	await expect(windowPhoto(page)).toHaveCount(1);
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Back to Who’s flying' }).click();
	await expect(windowPhoto(page)).toHaveCount(1);

	const href = await windowPhoto(page).getAttribute('href');
	const image = await page.request.get(href!);
	expect(image.status()).toBe(200);
	expect(image.headers()['content-type']).toBe('image/webp');
	expect(image.headers()['cache-control']).toContain('private');
	const meta = await sharp(await image.body()).metadata();
	expect(meta).toMatchObject({ format: 'webp', width: 400, height: 400 });

	// Another device in the family sees it; other people do not.
	const second = await browser.newContext({ baseURL: BASE });
	const secondPage = await second.newPage();
	await signIn(secondPage, { as: 'photo-flow' });
	await expect(windowPhoto(secondPage)).toHaveCount(1);
	await second.close();

	const stranger = await browser.newContext({ baseURL: BASE });
	expect((await stranger.request.get(href!)).status()).toBe(401);
	const otherPage = await stranger.newPage();
	await signIn(otherPage, { as: 'photo-other' });
	expect((await otherPage.request.get(href!)).status()).toBe(404);
	const png = (await photoFile()).buffer;
	expect((await upload(otherPage, mia, 'image/png', png)).status()).toBe(404);
	expect((await otherPage.goto(`/rocket/${mia}`))!.status()).toBe(404);
	await stranger.close();

	// A grown-up can take it down from Edit child.
	await page.goto('/grown-up/settings/children');
	await typePin(page);
	await page.getByRole('link', { name: /Mia.*Edit/ }).click();
	await expect(page.getByText('Photo added · shared on all your devices')).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Remove photo' }).click();
	await expect(page.getByRole('heading', { name: 'Remove Mia’s photo?' })).toBeVisible();
	await expectAccessible(page);
	await button(page, 'Yes, remove photo').click();
	await expect(page.getByText('Mia adds it · shared on all your devices')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Remove photo' })).toHaveCount(0);
	expect((await page.request.get(href!)).status()).toBe(404);
});

test('the server refuses bad files', async ({ page }) => {
	await signIn(page, { as: 'photo-bad' });
	const mia = await childId(page, 'Mia');
	const good = (await photoFile()).buffer;
	const refuse = async (type: string, data: Buffer, status: number) =>
		expect((await upload(page, mia, type, data)).status()).toBe(status);
	await refuse('text/plain', good, 415);
	await refuse('image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 415);
	await refuse('image/jpeg', Buffer.from('this is not a picture at all'), 400);
	await refuse('image/png', Buffer.alloc(600 * 1024, 1), 413);
	expect((await upload(page, 999_999, 'image/png', good)).status()).toBe(404);
	await page.goto('/');
	await expect(windowPhoto(page)).toHaveCount(0);

	// A photo that cannot be read says so kindly.
	await rocketLink(page, 'Mia').click();
	await page
		.locator('input[aria-label="Pick a photo"]')
		.setInputFiles({ name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('nope') });
	await expect(page.getByRole('alert')).toHaveText('That photo didn’t work. Try another one.');
});

test('a passcode guards the photo, and the photo goes with the child', async ({ page }) => {
	await signIn(page, { as: 'photo-pass' });
	const leo = await childId(page, 'Leo');
	const headers = await grownUpHeaders(page);
	const set = await page.request.put(`/api/grown-up/children/${leo}/passcode`, {
		headers,
		data: { pictures: ['rocket', 'star', 'paw'] }
	});
	expect(set.status()).toBe(204);

	await page.goto('/');
	await rocketLink(page, 'Leo').click();
	await expect(page).toHaveURL(`/passcode/${leo}?to=rocket`);
	const good = (await photoFile()).buffer;
	expect((await upload(page, leo, 'image/png', good)).status()).toBe(403);
	await page.goto(`/rocket/${leo}`);
	await expect(page).toHaveURL(`/passcode/${leo}?to=rocket`);

	for (const p of ['rocket', 'star', 'paw']) await button(page, p).click();
	await expect(page).toHaveURL(`/rocket/${leo}`);
	await addPhoto(page);
	await button(page, 'Looks good!').click();
	await expect(page.getByRole('heading', { name: 'Looking good, Leo!' })).toBeVisible();
	const href = await windowPhoto(page).getAttribute('href');

	const removed = await page.request.delete(`/api/grown-up/children/${leo}`, { headers });
	expect(removed.status()).toBe(204);
	expect((await page.request.get(href!)).status()).toBe(404);
});

const blockCamera = (page: Page) =>
	page.addInitScript(() => {
		navigator.permissions.query = (async () => ({
			state: 'denied',
			addEventListener() {},
			removeEventListener() {}
		})) as unknown as Permissions['query'];
	});

test('a chore photo shows everywhere, falls back, and can be removed', async ({ page }) => {
	test.setTimeout(90_000);
	await signIn(page, { as: 'photo-chore' });
	const mia = await childId(page, 'Mia');
	await page.goto('/grown-up/chores/new');
	await typePin(page);
	await page.getByLabel('Chore name').fill('Water the plants');
	await button(page, 'Use my own photo').click();
	await expect(page.getByRole('heading', { name: 'Photo for this chore' })).toBeVisible();
	await expectAccessible(page);
	await button(page, 'Use a picture instead').click();
	await expect(page.getByLabel('Chore name')).toHaveValue('Water the plants');
	await button(page, 'Use my own photo').click();
	await addPhoto(page);
	await expectAccessible(page);
	await button(page, 'Looks good!').click();
	await expect(page.getByText('Your photo')).toBeVisible();
	await expect(page.getByLabel('Chore name')).toHaveValue('Water the plants');
	await expectAccessible(page);
	await button(page, 'Add chore').click();
	await expect(page.getByRole('status')).toHaveText('Water the plants added');
	const row = page.getByRole('link', { name: /Water the plants/ });
	const src = await row.locator('img').getAttribute('src');
	const id = Number(src!.match(/chore\/(\d+)/)![1]);
	expect((await page.request.get(src!)).headers()['content-type']).toBe('image/webp');

	// The child sees it on the trip and the stop.
	await page.goto(`/trip/${mia}`);
	await expect(page.locator(`img[src="${src}"]`)).toBeVisible();
	await page.goto(`/trip/${mia}/stop/${id}`);
	await expect(page.locator(`img[src="${src}"]`)).toBeVisible();

	// While it loads, the stop says so; if it fails, the built-in picture shows.
	let release = () => {};
	const held = new Promise<void>((done) => (release = done));
	await page.route('**/api/photos/chore/**', async (route) => {
		await held;
		await route.abort();
	});
	await page.goto(`/trip/${mia}/stop/${id}`, { waitUntil: 'commit' });
	await expect(page.getByRole('img', { name: 'The photo is still loading' })).toBeVisible();
	await expect(page.getByText('Getting the photo…')).toBeVisible();
	release();
	await expect(page.getByRole('img', { name: 'The photo is still loading' })).toHaveCount(0);
	await expect(page.locator(`img[src="${src}"]`)).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'Water the plants' })).toBeVisible();
	await page.unroute('**/api/photos/chore/**');

	// Removing it asks first, and takes effect when the chore is saved.
	await page.goto(`/grown-up/chores/${id}/edit`);
	await typePin(page);
	await button(page, 'Remove').click();
	await expect(page.getByRole('heading', { name: 'Remove this photo?' })).toBeVisible();
	await expect(
		page.getByText('The built-in picture comes back for Water the plants.')
	).toBeVisible();
	await expectAccessible(page);
	await button(page, 'Keep photo').click();
	await button(page, 'Remove').click();
	await button(page, 'Yes, remove photo').click();
	await expect(button(page, 'Use my own photo')).toBeVisible();
	await button(page, 'Save changes').click();
	await expect(page.getByText('Saved')).toBeVisible();
	expect((await page.request.get(src!)).status()).toBe(404);
});

test('a reward photo is a round badge on its planet', async ({ page }) => {
	await signIn(page, { as: 'photo-reward' });
	const mia = await childId(page, 'Mia');
	await page.goto('/grown-up/rewards/new');
	await typePin(page);
	await page.getByLabel('Reward name').fill('Trip to the pool');
	await button(page, 'Use my own photo').click();
	await expect(page.getByRole('heading', { name: 'Photo for this reward' })).toBeVisible();
	await addPhoto(page);
	await button(page, 'Looks good!').click();
	await expect(page.getByText('Your photo')).toBeVisible();
	await expectAccessible(page);
	await button(page, 'Add reward').click();
	await expect(page.getByRole('status')).toHaveText('Trip to the pool added');
	const src = await page
		.getByRole('link', { name: /Trip to the pool/ })
		.locator('img')
		.getAttribute('src');
	await page.goto(`/trip/${mia}/rewards`);
	await expect(page.locator(`img[src="${src}"]`)).toBeVisible();
	await expectAccessible(page);

	// If the badge cannot load, the planet stays on its own.
	await page.route('**/api/photos/reward/**', (route) => route.abort());
	await page.reload();
	await expect(page.getByText('Trip to the pool')).toBeVisible();
	await expect(page.locator(`img[src="${src}"]`)).toHaveCount(0);
});

test('a blocked camera says so and still allows picking a photo', async ({ page }) => {
	await blockCamera(page);
	await signIn(page, { as: 'photo-camera' });
	await rocketLink(page, 'Mia').click();
	await button(page, 'Take a photo').click();
	await expect(page.getByRole('heading', { name: 'The camera is off' })).toBeVisible();
	await expectAccessible(page);
	await addPhoto(page);

	await page.goto('/grown-up/chores/new');
	await typePin(page);
	await button(page, 'Use my own photo').click();
	await button(page, 'Take a photo').click();
	await expect(page.getByText('The camera is turned off for this app')).toBeVisible();
	await expect(button(page, 'Try the camera again')).toBeVisible();
	await expectAccessible(page);
	await addPhoto(page);
});

test('chore and reward photos are checked and stay in the family', async ({ page, browser }) => {
	await signIn(page, { as: 'photo-owner' });
	const headers = await grownUpHeaders(page);
	const made = await page.request.post('/api/grown-up/rewards', {
		headers: { ...headers, 'content-type': 'application/json' },
		data: { name: 'Pool', cost: 10, colour: 'pink', childIds: [] }
	});
	const { id } = await made.json();
	const url = `/api/grown-up/photos/reward/${id}`;
	const good = (await photoFile()).buffer;
	const put = (p: Page, h: Record<string, string>, type: string, data: Buffer, to = url) =>
		p.request.put(to, { headers: { ...h, 'content-type': type }, data });

	expect((await put(page, { origin: BASE }, 'image/png', good)).status()).toBe(401);
	expect((await put(page, headers, 'text/plain', good)).status()).toBe(415);
	expect((await put(page, headers, 'image/png', Buffer.from('not a real picture'))).status()).toBe(
		400
	);
	expect((await put(page, headers, 'image/png', Buffer.alloc(600 * 1024, 1))).status()).toBe(413);
	const mia = await childId(page, 'Mia');
	const child = `/api/grown-up/photos/child/${mia}`;
	expect((await put(page, headers, 'image/png', good, child)).status()).toBe(404);
	const saved = await put(page, headers, 'image/png', good);
	expect(saved.status()).toBe(200);
	const { photo } = await saved.json();

	const context = await browser.newContext({ baseURL: BASE });
	const other = await context.newPage();
	await signIn(other, { as: 'photo-stranger' });
	const theirs = await grownUpHeaders(other);
	expect((await other.request.get(photo)).status()).toBe(404);
	expect((await put(other, theirs, 'image/png', good)).status()).toBe(404);
	expect((await other.request.delete(url, { headers: theirs })).status()).toBe(404);
	await context.close();

	const removed = await page.request.delete(`/api/grown-up/rewards/${id}`, { headers });
	expect(removed.status()).toBe(204);
	expect((await page.request.get(photo)).status()).toBe(404);
});
