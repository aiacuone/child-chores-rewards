import { expect, test } from '@playwright/test';
import { expectAccessible } from './helpers';

const parts: Record<string, string[]> = {
	Cadet: [],
	Pilot: ['stripes'],
	Explorer: ['stripes', 'boosters'],
	Captain: ['stripes', 'boosters', 'gold-trim'],
	Commander: ['stripes', 'boosters', 'gold-trim', 'glow', 'star']
};
const all = ['stripes', 'boosters', 'gold-trim', 'glow', 'star'];

test.beforeEach(async ({ page }) => {
	await page.goto('/test/rockets');
});

test('each rank adds its parts to the rocket', async ({ page }) => {
	for (const child of ['Mia', 'Leo'])
		for (const [rank, has] of Object.entries(parts)) {
			const rocket = page.getByTestId(`${child}-${rank}`).locator('svg');
			await expect(rocket).toHaveAttribute('data-rank', rank);
			for (const part of all)
				await expect(rocket.locator(`[data-part="${part}"]`), `${child} ${rank} ${part}`).toHaveCount(
					has.includes(part) ? 1 : 0
				);
		}
});

test('a rocket under 40 px stays plain', async ({ page }) => {
	const small = page.getByTestId('Mia-small').locator('svg');
	await expect(small).toHaveAttribute('data-rank', 'Cadet');
	await expect(small.locator('[data-part]')).toHaveCount(0);
});

test('the tab bar marks the current tab for screen readers', async ({ page }) => {
	const nav = page.getByRole('navigation', { name: 'Grown-up' });
	await expect(nav.getByRole('link')).toHaveText(['Home', 'Chores', 'Rewards', 'Ranks', 'Settings']);
	await expect(nav.getByRole('link', { name: 'Ranks' })).toHaveAttribute('aria-current', 'page');
	await expectAccessible(page);
});
