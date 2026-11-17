import { expect, test } from '@playwright/test';
import { expectAccessible, signIn } from './helpers';

// Grown-up setup steps 1 and 2 (#16): Setup-Children, then Setup-PIN.

test('a new family adds children and chooses a PIN', async ({ page }) => {
	await signIn(page, { as: 'setup-flow', newFamily: true });
	await expect(page).toHaveURL('/setup/children');
	await expect(page.getByRole('heading', { name: 'Who’s flying?' })).toBeVisible();
	await expect(page.getByText('Signed in with Google · s•••@example.test')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back' })).toHaveCount(0);
	await expectAccessible(page);

	// Nothing typed yet.
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('alert')).toHaveText('Add a name for each child.');

	await page.getByLabel('Child 1', { exact: true }).fill('Mia');
	await page.getByRole('button', { name: 'Add another child' }).click();
	await page.getByLabel('Child 2', { exact: true }).fill('Leo');
	// The second child starts on the next free colour.
	await expect(
		page.getByRole('group', { name: 'Child 2 rocket colour' }).getByRole('radio', { name: 'Blue' })
	).toBeChecked();
	await page
		.getByRole('group', { name: 'Child 2 rocket colour' })
		.getByRole('radio', { name: 'Purple' })
		.check();
	await page.getByRole('button', { name: 'Next' }).click();

	await expect(page).toHaveURL('/setup/pin');
	await expect(page.getByRole('heading', { name: 'Choose a grown-up PIN' })).toBeVisible();
	await expectAccessible(page);

	await page.getByLabel('PIN', { exact: true }).fill('12');
	await page.getByLabel('Type it again').fill('12');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('alert')).toHaveText('Use 4 numbers.');

	await page.getByLabel('PIN', { exact: true }).fill('4826');
	await page.getByLabel('Type it again').fill('4827');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('alert')).toHaveText("The PINs don't match. Try again.");

	// Back to step 1 keeps the children.
	await page.getByRole('link', { name: 'Back' }).click();
	await expect(page.getByLabel('Child 2', { exact: true })).toHaveValue('Leo');
	await expect(
		page
			.getByRole('group', { name: 'Child 2 rocket colour' })
			.getByRole('radio', { name: 'Purple' })
	).toBeChecked();
	await page.getByRole('button', { name: 'Next' }).click();

	await page.getByLabel('PIN', { exact: true }).fill('4826');
	await page.getByLabel('Type it again').fill('4826');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page).toHaveURL('/');

	// Setup is closed once the PIN is set.
	for (const path of ['/setup', '/setup/children', '/setup/pin']) {
		await page.goto(path);
		await expect(page, path).toHaveURL('/');
	}
});

test('two children cannot share a name or a colour', async ({ page }) => {
	await signIn(page, { as: 'setup-same', newFamily: true });
	await page.getByLabel('Child 1', { exact: true }).fill('Mia');
	await page.getByRole('button', { name: 'Add another child' }).click();
	await page.getByLabel('Child 2', { exact: true }).fill('mia');
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('alert')).toHaveText('Each child needs their own name.');

	await page.getByLabel('Child 2', { exact: true }).fill('Leo');
	await page
		.getByRole('group', { name: 'Child 2 rocket colour' })
		.getByRole('radio', { name: 'Pink' })
		.check();
	await page.getByRole('button', { name: 'Next' }).click();
	await expect(page.getByRole('alert')).toHaveText('Each child needs their own colour.');
});

test('at most 4 children', async ({ page }) => {
	await signIn(page, { as: 'setup-four', newFamily: true });
	const add = page.getByRole('button', { name: 'Add another child' });
	for (let i = 0; i < 3; i++) await add.click();
	await expect(page.getByLabel('Child 4', { exact: true })).toBeVisible();
	await expect(add).toHaveCount(0);
});

test('the PIN step needs children first', async ({ page }) => {
	await signIn(page, { as: 'setup-skip', newFamily: true });
	await page.goto('/setup/pin');
	await expect(page).toHaveURL('/setup/children');
});

test('the server refuses a PIN post once setup is done', async ({ page }) => {
	await signIn(page);
	const res = await page.request.post('/setup/pin', {
		form: { pin: '0000', again: '0000' },
		// Post like a plain browser form, so the answer is a real redirect, not JSON.
		headers: { origin: 'http://localhost:4173', accept: 'text/html' },
		maxRedirects: 0
	});
	expect(res.status()).toBe(303);
	expect(res.headers()['location']).toBe('/');
});
