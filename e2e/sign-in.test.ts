import { expect, test } from '@playwright/test';
import { expectAccessible, signIn } from './helpers';

test('a signed-out visitor is sent to the sign-in page', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL('/login');
	await expect(page.getByRole('link', { name: /Continue with Google/ })).toBeVisible();
	await expectAccessible(page);
});

test('the test sign-in signs in a grown-up', async ({ page }) => {
	await signIn(page);
	await expect(page).toHaveURL('/');
	await expect(page.getByRole('heading', { name: 'Who’s flying today?' })).toBeVisible();
	await expectAccessible(page);
});

test('the test pages are refused when TEST_ROUTES is not set, as on the live site', async ({
	request
}) => {
	for (const path of ['/test/sign-in', '/test/rockets']) {
		const res = await request.get(`http://localhost:4174${path}`, { maxRedirects: 0 });
		expect(res.status(), path).toBe(404);
		expect(res.headers()['set-cookie'] ?? '', path).not.toContain('session=');
	}
});
