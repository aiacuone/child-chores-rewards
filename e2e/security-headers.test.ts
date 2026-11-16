import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

// Issue #15: the security headers are on every page, and the content security
// policy blocks nothing the pages need (the fonts, SvelteKit's own script).

function collectCspErrors(page: Page) {
	const errors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) errors.push(msg.text());
	});
	return errors;
}

test('pages send the security headers', async ({ request }) => {
	for (const path of ['/login', '/test/missing-page']) {
		const res = await request.get(path, { maxRedirects: 0 });
		const h = res.headers();
		expect(h['content-security-policy'], path).toContain("frame-ancestors 'none'");
		expect(h['content-security-policy'], path).toContain("object-src 'none'");
		expect(h['strict-transport-security'], path).toBe('max-age=31536000; includeSubDomains');
		expect(h['x-content-type-options'], path).toBe('nosniff');
		expect(h['x-frame-options'], path).toBe('DENY');
		expect(h['referrer-policy'], path).toBe('strict-origin-when-cross-origin');
	}
});

test('the refused test pages and the API send them too', async ({ request }) => {
	for (const url of ['http://localhost:4174/test/sign-in', 'http://localhost:4174/api/anything']) {
		const h = (await request.get(url, { maxRedirects: 0 })).headers();
		expect(h['x-content-type-options'], url).toBe('nosniff');
		expect(h['x-frame-options'], url).toBe('DENY');
	}
});

test('the sign-in page loads its fonts and script under the policy', async ({ page }) => {
	const errors = collectCspErrors(page);
	await page.goto('/login');
	await page.evaluate(() => document.fonts.ready);
	expect(await page.evaluate(() => document.fonts.check('40px "Lilita One"'))).toBe(true);
	expect(errors).toEqual([]);
});

test('a signed-in page runs under the policy', async ({ page }) => {
	const errors = collectCspErrors(page);
	await signIn(page);
	await page.goto('/test/rockets');
	await expect(page.locator('svg[data-rank]').first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('an inline script added to a page is blocked', async ({ page }) => {
	await page.goto('/login');
	const ran = await page.evaluate(() => {
		const s = document.createElement('script');
		s.textContent = 'window.__injected = true';
		document.body.append(s);
		return (window as unknown as { __injected?: boolean }).__injected === true;
	});
	expect(ran).toBe(false);
});
