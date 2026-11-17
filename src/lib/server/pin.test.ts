import { describe, expect, it } from 'vitest';
import { hashPin, isPin, verifyPin } from './pin';

describe('PIN hashing', () => {
	it('accepts only 4 digits', () => {
		for (const ok of ['0000', '4826']) expect(isPin(ok)).toBe(true);
		for (const bad of ['', '123', '12345', '12a4', ' 1234', '١٢٣٤', 1234])
			expect(isPin(bad)).toBe(false);
		expect(() => hashPin('123')).toThrow();
	});

	it('salts each hash', () => {
		const a = hashPin('4826');
		const b = hashPin('4826');
		expect(a).not.toBe(b);
		expect(verifyPin('4826', a) && verifyPin('4826', b)).toBe(true);
	});

	it('refuses a wrong PIN or a damaged hash', () => {
		const h = hashPin('4826');
		expect(verifyPin('4827', h)).toBe(false);
		expect(verifyPin('4826', 'plain')).toBe(false);
		expect(verifyPin('4826', h.replace('scrypt', 'md5'))).toBe(false);
	});
});
