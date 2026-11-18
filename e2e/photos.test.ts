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
	await expect(page.getByText('Mia adds it · shared on all your devices')).toBeVisible();
	await expectAccessible(page);
	await button(page, 'Remove photo').click();
	await expect(button(page, 'Remove photo')).toHaveCount(0);
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
