import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Sign in as the test grown-up, skipping Google. Works only on the test server. */
export async function signIn(page: Page) {
	await page.goto('/test/sign-in');
	await expect(page).toHaveURL('/');
}

/** Fail on any accessibility problem axe finds on the page as it is now. */
export async function expectAccessible(page: Page) {
	const { violations } = await new AxeBuilder({ page }).analyze();
	expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}
