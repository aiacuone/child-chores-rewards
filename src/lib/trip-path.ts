// Where things go on a child's trip (Space-Child.dc.html), for any number of
// stops. The path starts at the home planet at the bottom, zig-zags up through
// the stops (left, right, left …), and ends at the bonus planet at the top.
// Coordinates are on a 390 px wide board, as in the design; the page turns x
// into percentages so it fits narrower phones.

export const BOARD_WIDTH = 390;
const TOP_STOP = 146; // y of the highest stop
const STEP = 100; // between stops
const LEFT = 110;
const RIGHT = 280;
const HOME = { x: 200, below: 90 }; // centre of the home planet, below the first stop
const BONUS = { x: 300, above: 90 }; // where the path ends, above the last stop

export type Point = { x: number; y: number };

/** One curved step from a to b, as the design draws it. */
const curve = (a: Point, b: Point) => {
	const m = (a.y + b.y) / 2;
	return { c1: { x: a.x, y: m }, c2: { x: b.x, y: m } };
};

const at = (p: Point) => `${p.x} ${p.y}`;

/**
 * The layout for `count` stops when `finished` of them (done or waiting for a
 * grown-up) are at the start of the path. The rocket sits halfway along the
 * step after the last finished stop, and the teal trail runs up to it.
 */
export function tripPath(count: number, finished: number) {
	const homeY = TOP_STOP + (count - 1) * STEP + HOME.below;
	const stops: Point[] = Array.from({ length: count }, (_, i) => ({
		x: i % 2 === 0 ? LEFT : RIGHT,
		y: TOP_STOP + (count - 1 - i) * STEP
	}));
	const home = { x: HOME.x, y: homeY };
	const end = { x: BONUS.x, y: TOP_STOP - BONUS.above };
	const points = [{ x: home.x, y: home.y - 8 }, ...stops, end];

	let path = `M${at(points[0])}`;
	for (let i = 0; i < points.length - 1; i++) {
		const { c1, c2 } = curve(points[i], points[i + 1]);
		path += ` C${at(c1)} ${at(c2)} ${at(points[i + 1])}`;
	}

	// The trail: every step up to the last finished stop, then the first half
	// of the next step (split with de Casteljau's rule, so it follows the curve).
	const k = Math.min(finished, count);
	let trail = `M${at(points[0])}`;
	for (let i = 0; i < k; i++) {
		const { c1, c2 } = curve(points[i], points[i + 1]);
		trail += ` C${at(c1)} ${at(c2)} ${at(points[i + 1])}`;
	}
	const a = points[k];
	const b = points[k + 1];
	const m = (a.y + b.y) / 2;
	const rocket = { x: (a.x + b.x) / 2, y: m };
	trail += ` C${a.x} ${(a.y + m) / 2} ${(3 * a.x + b.x) / 4} ${(a.y + 3 * m) / 4} ${at(rocket)}`;

	return {
		height: homeY + 24 + 16,
		stops,
		home,
		/** The centre of the bonus planet. */
		bonus: { x: 312, y: 48 },
		path,
		trail,
		rocket: { ...rocket, rotate: b.x < a.x ? -20 : b.x > a.x ? 20 : 0 }
	};
}

/** An x on the board as a percentage of its width. */
export const pct = (x: number) => `${(x / BOARD_WIDTH) * 100}%`;
