import { describe, expect, it } from 'vitest';
import { isAllowedEmail, parseAllowedEmails } from './allowlist';

describe('allowed emails', () => {
	it('splits on commas, spaces and new lines, ignoring case', () => {
		const set = parseAllowedEmails('Mum@Example.com, dad@example.com\nnan@example.com');
		expect([...set].sort()).toEqual(['dad@example.com', 'mum@example.com', 'nan@example.com']);
	});

	it('lets a listed email in, whatever its case', () => {
		expect(isAllowedEmail('mum@example.com', 'MUM@example.com')).toBe(true);
	});

	it('keeps an unlisted email out', () => {
		expect(isAllowedEmail('mum@example.com', 'stranger@example.com')).toBe(false);
	});

	it('lets nobody in when the list is missing or empty', () => {
		expect(isAllowedEmail(undefined, 'mum@example.com')).toBe(false);
		expect(isAllowedEmail('  ', 'mum@example.com')).toBe(false);
	});
});
