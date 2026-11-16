import { describe, expect, it } from 'vitest';
import { testRoutesAllowed } from './test-routes';

describe('test-only pages', () => {
	it('are allowed only when turned on and on localhost', () => {
		expect(testRoutesAllowed(new URL('http://localhost:4173/test/sign-in'), true)).toBe(true);
		expect(testRoutesAllowed(new URL('http://127.0.0.1:4173/test/sign-in'), true)).toBe(true);
	});

	it('are refused when not turned on', () => {
		expect(testRoutesAllowed(new URL('http://localhost:4173/test/sign-in'), false)).toBe(false);
	});

	it('are refused on the live address even if turned on by mistake', () => {
		expect(testRoutesAllowed(new URL('https://rocket-rewards.duckdns.org/test/sign-in'), true)).toBe(
			false
		);
		expect(testRoutesAllowed(new URL('http://localhost.evil.example/test/sign-in'), true)).toBe(false);
	});
});
