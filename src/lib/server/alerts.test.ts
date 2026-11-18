import { afterEach, describe, expect, it, vi } from 'vitest';
import { ALERTS, AlertNotSent, isTopic, newTopic, sendAlert } from './alerts';

afterEach(() => vi.unstubAllGlobals());

describe('ntfy alerts', () => {
	it('makes short random topics', () => {
		const a = newTopic();
		expect(a).toMatch(/^rocket-[a-z0-9]{12}$/);
		expect(isTopic(a)).toBe(true);
		expect(newTopic()).not.toBe(a);
	});

	it('still accepts the longer topics of existing families', () => {
		expect(isTopic('a1'.repeat(16))).toBe(true);
	});

	it('refuses a simple name, which anyone could guess', () => {
		for (const t of ['rocket-rewards', 'rocket-', 'rocket-ABCDEFGHIJKL', 'rocket-abc/defghijk'])
			expect(isTopic(t)).toBe(false);
	});

	it('posts the alert to the topic with caching off', async () => {
		const fetch = vi.fn().mockResolvedValue(new Response('{}'));
		vi.stubGlobal('fetch', fetch);
		const topic = newTopic();
		await sendAlert(topic, ALERTS.test);
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe(`https://ntfy.sh/${topic}`);
		expect(init.method).toBe('POST');
		expect(init.headers).toMatchObject({ Title: 'Test alert', Cache: 'no' });
		expect(init.body).toBe('Rocket Rewards alerts are working.');
	});

	it('refuses a bad topic without sending', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		for (const t of ['', 'short', '../admin', 'A'.repeat(32)])
			await expect(sendAlert(t, ALERTS.test)).rejects.toThrow(AlertNotSent);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('reports a failed send', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no', { status: 500 })));
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(sendAlert(newTopic(), ALERTS.test)).rejects.toThrow(AlertNotSent);
	});
});
