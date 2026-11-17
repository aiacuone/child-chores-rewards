import { describe, expect, it } from 'vitest';
import { MESSAGES, parseChildren, parseEmail, parsePin } from './setup';

const form = (fields: Record<string, string | string[]>) => {
	const f = new FormData();
	for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
	return f;
};

describe('children form', () => {
	it('reads each child and skips blank extra rows', () => {
		const r = parseChildren(
			form({
				'name-0': ' Mia ',
				'colour-0': 'pink',
				'name-1': '',
				'colour-1': 'blue',
				'name-2': 'Zoë',
				'colour-2': 'green'
			})
		);
		expect(r).toEqual({
			ok: true,
			value: [
				{ name: 'Mia', colour: 'pink' },
				{ name: 'Zoë', colour: 'green' }
			]
		});
	});

	it('allows names like Mary-Jane and O’Neil', () => {
		for (const name of ['Mary-Jane', "O'Neil", 'O’Neil', 'Anna Maria', 'J.']) {
			expect(parseChildren(form({ 'name-0': name, 'colour-0': 'pink' })).ok, name).toBe(true);
		}
	});

	it('needs at least one name', () => {
		expect(parseChildren(form({ 'name-0': '   ', 'colour-0': 'pink' }))).toEqual({
			ok: false,
			message: MESSAGES.noName
		});
		expect(parseChildren(form({}))).toEqual({
			ok: false,
			message: MESSAGES.noName
		});
	});

	it('refuses long names and names with symbols, digits or markup', () => {
		for (const name of ['A'.repeat(21), '<b>Mia</b>', 'Mia2', 'Mia\u0000', '--', 'Mia  Rose']) {
			expect(parseChildren(form({ 'name-0': name, 'colour-0': 'pink' })), name).toEqual({
				ok: false,
				message: MESSAGES.badName
			});
		}
	});

	it('refuses repeated names (any case) and repeated colours', () => {
		expect(
			parseChildren(
				form({
					'name-0': 'Mia',
					'colour-0': 'pink',
					'name-1': 'MIA',
					'colour-1': 'blue'
				})
			)
		).toEqual({
			ok: false,
			message: MESSAGES.sameName
		});
		expect(
			parseChildren(
				form({
					'name-0': 'Mia',
					'colour-0': 'pink',
					'name-1': 'Leo',
					'colour-1': 'pink'
				})
			)
		).toEqual({
			ok: false,
			message: MESSAGES.sameColour
		});
	});

	it('refuses an unknown colour, a fifth child, a repeated field or an unknown field', () => {
		const forms: Record<string, string | string[]>[] = [
			{ 'name-0': 'Mia', 'colour-0': 'red' },
			{ 'name-0': 'Mia' },
			{
				'name-0': 'Mia',
				'colour-0': 'pink',
				'name-4': 'Max',
				'colour-4': 'blue'
			},
			{ 'name-0': ['Mia', 'Leo'], 'colour-0': 'pink' },
			{ 'name-0': 'Mia', 'colour-0': 'pink', familyId: '2' }
		];
		for (const f of forms) {
			expect(parseChildren(form(f)).ok, JSON.stringify(f)).toBe(false);
		}
	});
});

describe('PIN form', () => {
	it('accepts 4 matching digits', () => {
		expect(parsePin(form({ pin: '4826', again: '4826' }))).toEqual({
			ok: true,
			value: '4826'
		});
	});

	it('refuses anything but 4 digits', () => {
		for (const pin of ['', '123', '12345', 'abcd', '12 4', '١٢٣٤'])
			expect(parsePin(form({ pin, again: pin })), pin).toEqual({
				ok: false,
				message: MESSAGES.pinShape
			});
		expect(parsePin(form({ again: '1234' }))).toEqual({
			ok: false,
			message: MESSAGES.pinShape
		});
	});

	it('refuses PINs that do not match', () => {
		expect(parsePin(form({ pin: '4826', again: '4827' }))).toEqual({
			ok: false,
			message: MESSAGES.pinMatch
		});
	});
});

describe('recovery email form', () => {
	it('accepts a plain address', () => {
		expect(parseEmail(form({ email: ' jane@example.com ' }))).toEqual({
			ok: true,
			value: 'jane@example.com'
		});
	});

	it('refuses anything else', () => {
		for (const email of [
			'',
			'jane',
			'jane@',
			'@example.com',
			'jane @example.com',
			'jane@example.com\r\nBcc: x@example.com',
			'"Jane" <jane@example.com>',
			`${'a'.repeat(250)}@example.com`
		])
			expect(parseEmail(form({ email })), email).toEqual({ ok: false, message: MESSAGES.badEmail });
		expect(parseEmail(form({}))).toEqual({ ok: false, message: MESSAGES.badEmail });
	});
});
