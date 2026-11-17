// Test runs (TEST_ROUTES=1) keep emails and alerts here instead of sending
// them, and /test/outbox shows them to Playwright. Never used on the live site.
export type SentEmail = { to: string; subject: string; text: string };
export type SentAlert = { topic: string; headers: Record<string, string>; body: string };

export const outbox = { emails: [] as SentEmail[], alerts: [] as SentAlert[] };
