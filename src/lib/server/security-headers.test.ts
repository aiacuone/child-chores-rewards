import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS, addSecurityHeaders } from './security-headers';

describe('addSecurityHeaders', () => {
	it('adds every header', () => {
		const h = new Headers();
		addSecurityHeaders(h);
		for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(h.get(name)).toBe(value);
	});

	it('keeps a header a route set itself', () => {
		const h = new Headers({ 'Referrer-Policy': 'no-referrer' });
		addSecurityHeaders(h);
		expect(h.get('Referrer-Policy')).toBe('no-referrer');
	});
});
