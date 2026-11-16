import { describe, expect, it } from 'vitest';
import { rankFor } from './ranks';

describe('ranks', () => {
	it.each([
		[0, 'Cadet'],
		[49, 'Cadet'],
		[50, 'Pilot'],
		[99, 'Pilot'],
		[100, 'Explorer'],
		[249, 'Explorer'],
		[250, 'Captain'],
		[499, 'Captain'],
		[500, 'Commander'],
		[9999, 'Commander']
	])('%i stars is %s', (stars, rank) => {
		expect(rankFor(stars).rank).toBe(rank);
	});

	it('says how many stars the next rank needs', () => {
		expect(rankFor(128).next).toEqual({ rank: 'Captain', starsNeeded: 122 });
		expect(rankFor(500).next).toBeNull();
	});

	it('treats a negative balance as Cadet', () => {
		expect(rankFor(-5)).toEqual({ rank: 'Cadet', next: { rank: 'Pilot', starsNeeded: 50 } });
	});
});
