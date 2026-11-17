// ntfy alerts (ADR 0009). The server publishes to the family's secret topic on
// ntfy.sh. Alerts never carry names or details (docs/SPEC.md, "Notifications
// with ntfy"), and ntfy caching is off so a late subscriber reads nothing old.
import { randomInt } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { TEST_ROUTES } from '$app/env/private';
import { schema } from './db';
import type { FamilyScope } from './family';
import { outbox } from './outbox';

const NTFY = 'https://ntfy.sh';
const TOPIC_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const TOPIC_LENGTH = 32;

export const ALERTS = {
	test: { title: 'Test alert', body: 'Rocket Rewards alerts are working.' }
} as const;

export type Alert = { title: string; body: string };

export class AlertNotSent extends Error {}

/** A new random topic: 32 letters and digits, about 165 bits. */
export function newTopic() {
	let t = '';
	for (let i = 0; i < TOPIC_LENGTH; i++) t += TOPIC_CHARS[randomInt(TOPIC_CHARS.length)];
	return t;
}

export const isTopic = (t: unknown): t is string =>
	typeof t === 'string' && new RegExp(`^[a-z0-9]{${TOPIC_LENGTH}}$`).test(t);

/** The family's topic, made the first time it is needed. */
export function ensureTopic(scope: FamilyScope) {
	const [row] = scope.db
		.select({ topic: schema.family.ntfyTopic })
		.from(schema.family)
		.where(eq(schema.family.id, scope.familyId))
		.all();
	if (row?.topic) return row.topic;
	const topic = newTopic();
	scope.db
		.update(schema.family)
		.set({ ntfyTopic: topic })
		.where(eq(schema.family.id, scope.familyId))
		.run();
	return topic;
}

export async function sendAlert(topic: string, alert: Alert) {
	if (!isTopic(topic)) throw new AlertNotSent('bad topic');
	const headers = { Title: alert.title, Cache: 'no', Tags: 'rocket' };
	if (TEST_ROUTES) {
		outbox.alerts.push({ topic, headers, body: alert.body });
		return;
	}
	try {
		const res = await fetch(`${NTFY}/${topic}`, {
			method: 'POST',
			headers,
			body: alert.body,
			signal: AbortSignal.timeout(10_000)
		});
		if (!res.ok) throw new Error(`status ${res.status}`);
	} catch (e) {
		console.error('alerts: send failed', (e as Error).message);
		throw new AlertNotSent('send failed');
	}
}
