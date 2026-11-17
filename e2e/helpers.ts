import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** The PIN of the family that /test/sign-in sets up. */
export const TEST_PIN = '1234';

/**
 * Sign in without Google. Works only on the test server.
 * - no options: the shared test grown-up, whose family has finished setup,
 * - `as`: a separate grown-up with their own family,
 * - `newFamily`: leave that family's setup unfinished.
 */
export async function signIn(page: Page, opts: { as?: string; newFamily?: boolean } = {}) {
	const q = new URLSearchParams();
	if (opts.as) q.set('as', opts.as);
	if (opts.newFamily) q.set('setup', 'new');
	await page.goto(`/test/sign-in?${q}`);
}

/** Fail on any accessibility problem axe finds on the page as it is now. */
export async function expectAccessible(page: Page) {
	const { violations } = await new AxeBuilder({ page }).analyze();
	expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}
