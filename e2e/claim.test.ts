import { expect, test } from '@playwright/test';
import {
	BASE,
	TEST_PIN,
	acceptStop,
	addChores,
	expectAccessible,
	signIn,
	typePin
} from './helpers';

// Claiming a reward (#27): a child asks, a grown-up hands it out or declines it.
// Stars are taken only when a grown-up confirms.

type Alert = { headers: Record<string, string>; body: string };
const grownUp = (token: string) => ({
	origin: BASE,
	'content-type': 'application/json',
	'x-grown-up': token
});

test('a child claims, a grown-up hands out or declines, and stars move only on a hand-out', async ({
	page,
	browser
}) => {
	test.setTimeout(120_000);
	await signIn(page, { as: 'claim-flow' });
	const { mia, ids } = await addChores(page, [
		{ name: 'Make your bed' },
		{ name: 'Set the table' }
	]);
	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	// Mia finishes both stops: 10 + 10 stars and the 20-star bonus.
	await acceptStop(page, 'claim-flow', mia, ids['Make your bed'], token);
	await acceptStop(page, 'claim-flow', mia, ids['Set the table'], token);
	for (const [name, cost] of [
		['Extra screen time', 25],
		['Movie night', 100],
		['Sticker', 5]
	] as const)
		expect(
			(
				await page.request.post('/api/grown-up/rewards', {
					headers: grownUp(token),
					data: { name, cost, colour: 'blue', childIds: [mia] }
				})
			).status()
		).toBe(201);
	const alertsNow = async () =>
		(
			(await (await page.request.get('/test/outbox?as=claim-flow')).json()) as {
				alerts: Alert[];
			}
		).alerts.filter((a) => a.headers.Title === 'A reward was claimed');

	// The tablet: Claim only where Mia has enough stars.
	const tablet = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(tablet, { as: 'claim-flow' });
	await tablet.goto(`/trip/${mia}/rewards`);
	const cards = tablet.getByRole('list').getByRole('listitem');
	await expect(cards).toHaveText([
		/Sticker\s*5\s*stars\s*Ready to claim!\s*Claim$/,
		/Extra screen time\s*25\s*stars\s*Ready to claim!\s*Claim$/,
		/Movie night\s*100\s*stars\s*60 stars to go/
	]);
	await expectAccessible(tablet);

	// Claim: "Asked a grown-up!", one alert with no names, and no stars taken.
	await tablet.getByRole('button', { name: 'Claim Extra screen time' }).click();
	await expect(tablet.getByRole('heading', { name: 'Asked a grown-up!' })).toBeVisible();
	await expect(
		tablet.getByText(
			'Extra screen time is on its way. Your stars stay safe until a grown-up hands it out.'
		)
	).toBeVisible();
	await expectAccessible(tablet);
	const [alert] = await alertsNow();
	expect(alert.body).toBe('A child wants a reward. Open Rocket Rewards to hand it out.');
	expect(alert.headers.Cache).toBe('no');
	expect(alert.headers.Click).toMatch(new RegExp(`^${BASE}/grown-up/claim/\\d+$`));
	await tablet.getByRole('link', { name: 'Back', exact: true }).click();
	await expect(cards.nth(1)).toHaveText(/Extra screen time\s*25\s*stars\s*Asked a grown-up!/);
	await expect(cards.nth(1).getByRole('button')).toHaveCount(0);
	await expect(tablet.getByText('40 stars', { exact: true }).first()).toBeVisible();

	// A second claim for the same reward changes nothing and sends nothing.
	const rewards = (
		await (await page.request.get('/api/grown-up/rewards', { headers: grownUp(token) })).json()
	).rewards as { id: number; name: string }[];
	const extra = rewards.find((r) => r.name === 'Extra screen time')!.id;
	const again = await tablet.request.post(`/trip/${mia}/rewards?/claim`, {
		headers: { origin: BASE, accept: 'text/html' },
		form: { reward: String(extra) },
		maxRedirects: 0
	});
	expect(again.status()).toBe(303);
	expect(await alertsNow()).toHaveLength(1);

	// The grown-up: PIN from the alert's link, then the hand-out screen.
	await page.goto(alert.headers.Click);
	await typePin(page);
	await expect(page.getByRole('heading', { name: 'Extra screen time' })).toBeVisible();
	await expect(page.getByText('40 → 15')).toBeVisible();
	await expect(page.getByText('Stars are only taken when you confirm.')).toBeVisible();
	await expectAccessible(page);
	await page.getByRole('link', { name: 'Back' }).click();
	await expect(page.getByText(/1 reward to hand out\s*Mia: Extra screen time/)).toBeVisible();
	await page.getByRole('link', { name: /1 reward to hand out/ }).click();
	await page.getByRole('button', { name: 'Yes, I handed it out' }).click();
	await expect(page).toHaveURL(new RegExp(`${BASE}/grown-up/rewards\\?handed=\\d+`));
	await expect(page.getByRole('status')).toHaveText('Handed out. Mia has 15 stars left');
	await expectAccessible(page);

	// The tablet follows: handed out once, the stars taken, and not shown again.
	await expect(tablet.getByRole('status')).toHaveText(/Extra screen time handed out!\s*−25 stars/, {
		timeout: 10_000
	});
	await expect(tablet.getByText('15 stars', { exact: true }).first()).toBeVisible();
	await tablet.goto(`/trip/${mia}/rewards`);
	await expect(tablet.getByRole('status')).toHaveCount(0);
	await expect(cards.nth(1)).toHaveText(/Extra screen time\s*25\s*stars\s*10 stars to go/);

	// Decline: kind message, stars kept, and Mia can ask again straight away.
	await tablet.getByRole('button', { name: 'Claim Sticker' }).click();
	await expect(tablet.getByRole('heading', { name: 'Asked a grown-up!' })).toBeVisible();
	const claim = (await alertsNow()).at(-1)!.headers.Click;
	await page.goto(claim);
	await typePin(page);
	await page.getByRole('link', { name: 'Not now' }).click();
	await expect(page.getByRole('heading', { name: 'Not now' })).toBeVisible();
	await expect(
		page.getByText('Mia sees your message. The stars stay safe, and Mia can ask again.')
	).toBeVisible();
	await expectAccessible(page);
	await page.getByText('Maybe on the weekend!').click();
	await page.getByRole('button', { name: 'Send message' }).click();
	await expect(page.getByRole('status')).toHaveText('Told Mia: “Maybe on the weekend!”');
	await expect(tablet.getByRole('status')).toHaveText(
		'Grown-up says: “Maybe on the weekend!” Your stars are safe.',
		{ timeout: 10_000 }
	);
	await expect(tablet.getByText('15 stars', { exact: true }).first()).toBeVisible();
	await expect(tablet.getByRole('button', { name: 'Claim Sticker' })).toBeVisible();
	await tablet.context().close();
});

test('a hand-out is refused when the stars are gone, and answers are only for the family', async ({
	page,
	browser
}) => {
	test.setTimeout(60_000);
	await signIn(page, { as: 'claim-short' });
	const { mia, ids } = await addChores(page, [{ name: 'Make your bed' }]);
	const { token } = await (
		await page.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })
	).json();
	const copy = await acceptStop(page, 'claim-short', mia, ids['Make your bed'], token);
	await page.request.post('/api/grown-up/rewards', {
		headers: grownUp(token),
		data: { name: 'Sticker', cost: 25, colour: 'pink', childIds: [mia] }
	});
	await page.goto(`/trip/${mia}/rewards`);
	await page.getByRole('button', { name: 'Claim Sticker' }).click();
	const { alerts } = (await (await page.request.get('/test/outbox?as=claim-short')).json()) as {
		alerts: Alert[];
	};
	const claimId = alerts
		.findLast((a) => a.headers.Title === 'A reward was claimed')!
		.headers.Click.split('/')
		.pop();

	// Mia's chore is undone before the grown-up answers: 30 stars become 0.
	const undone = await page.request.post(`/api/grown-up/checks/${copy}`, {
		headers: grownUp(token),
		data: { action: 'undo' }
	});
	expect(undone.status()).toBe(204);
	const url = `/api/grown-up/claims/${claimId}`;
	const short = await page.request.post(url, {
		headers: grownUp(token),
		data: { action: 'handOut' }
	});
	expect(short.status()).toBe(409);
	expect(await short.json()).toEqual({ reason: 'short' });
	await page.goto(`/grown-up/claim/${claimId}`);
	await typePin(page);
	await expect(page.getByRole('alert')).toHaveText('Mia doesn’t have enough stars for this now.');
	await expect(page.getByRole('button', { name: 'Yes, I handed it out' })).toBeDisabled();
	await expectAccessible(page);

	// Bad input is refused; without grown-up mode, nothing.
	for (const bad of [
		{ action: 'refund' },
		{ action: 'decline' },
		{ action: 'decline', message: '' }
	])
		expect((await page.request.post(url, { headers: grownUp(token), data: bad })).status()).toBe(
			400
		);
	expect(
		(
			await page.request.post(url, {
				headers: { origin: BASE, 'content-type': 'application/json' },
				data: { action: 'handOut' }
			})
		).status()
	).toBe(401);

	// Another family reads and answers nothing.
	const other = await (await browser.newContext({ baseURL: BASE })).newPage();
	await signIn(other, { as: 'claim-theirs' });
	const theirs = (
		await (await other.request.post('/api/grown-up/unlock', { data: { pin: TEST_PIN } })).json()
	).token as string;
	expect((await other.request.get(url, { headers: grownUp(theirs) })).status()).toBe(404);
	expect(
		(
			await other.request.post(url, { headers: grownUp(theirs), data: { action: 'handOut' } })
		).status()
	).toBe(404);
	expect(
		(
			await other.request.post(url, {
				headers: grownUp(theirs),
				data: { action: 'decline', message: 'No' }
			})
		).status()
	).toBe(404);
	// Nor can their device claim for our child: it goes back to Who's flying and nothing is asked.
	const stolen = await other.request.post(`/trip/${mia}/rewards?/claim`, {
		headers: { origin: BASE, accept: 'text/html' },
		form: { reward: '1' },
		maxRedirects: 0
	});
	expect(stolen.status()).toBe(303);
	expect(stolen.headers().location).toBe('/');

	// Ours can still be declined.
	const declined = await page.request.post(url, {
		headers: grownUp(token),
		data: { action: 'decline', message: 'Ask me again tomorrow' }
	});
	expect(declined.status()).toBe(204);
	expect(
		(
			await page.request.post(url, { headers: grownUp(token), data: { action: 'handOut' } })
		).status()
	).toBe(409);
	await other.context().close();
});
