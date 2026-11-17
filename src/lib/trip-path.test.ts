import { describe, expect, it } from 'vitest';
import { tripPath } from './trip-path';

describe('tripPath', () => {
	it('matches the design for 5 stops with 2 finished (Space-Child.dc.html)', () => {
		// The design's board starts 84 px lower, so its y values are 84 more.
		const b = tripPath(5, 2);
		expect(b.stops.map((p) => [p.x, p.y + 84])).toEqual([
			[110, 630],
			[280, 530],
			[110, 430],
			[280, 330],
			[110, 230]
		]);
		expect(b.home).toEqual({ x: 200, y: 720 - 84 });
		expect(b.rocket).toEqual({ x: 195, y: 480 - 84, rotate: -20 });
		expect(b.path.startsWith('M200 628 C200 587 110 587 110 546')).toBe(true);
		expect(b.path.endsWith('300 56')).toBe(true);
	});

	it('puts the rocket between home and the first stop when nothing is finished', () => {
		const b = tripPath(3, 0);
		expect(b.rocket.x).toBe((200 + 110) / 2);
		expect(b.rocket.rotate).toBe(-20);
	});

	it('puts the rocket on the way to the bonus planet when every stop is finished', () => {
		const b = tripPath(2, 2);
		expect(b.rocket).toMatchObject({ x: (280 + 300) / 2, rotate: 20 });
	});

	it('grows taller with more stops, and the trail never goes past the rocket', () => {
		expect(tripPath(8, 0).height - tripPath(5, 0).height).toBe(300);
		const b = tripPath(1, 1);
		expect(b.trail.endsWith(`${b.rocket.x} ${b.rocket.y}`)).toBe(true);
	});
});
