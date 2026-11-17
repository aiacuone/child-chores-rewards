<script lang="ts">
	// A built-in chore picture (Add-Stop.dc.html), on a 24 x 24 grid.
	import type { ChoreIconId } from '#lib/chore-icons.ts';

	let {
		icon,
		size = 22,
		colour = 'currentColor'
	}: { icon: ChoreIconId; size?: number; colour?: string } = $props();

	// A circle as a path: two half arcs from its left edge.
	const circle = (cx: number, cy: number, rx: number, ry = rx) =>
		`M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;

	// Each picture as one path, so the template has a single <path>.
	// A Record makes leaving out a picture a type error.
	const DRAWINGS: Record<ChoreIconId, string> = {
		bed: ['M3 19V7M3 15h18v4M21 19v-4a3 3 0 00-3-3h-8v3', circle(6.5, 11.5, 2)].join(''),
		paw: [
			circle(12, 16, 4, 3.5),
			circle(6, 11, 1.8),
			circle(9.5, 6.5, 1.8),
			circle(14.5, 6.5, 1.8),
			circle(18, 11, 1.8)
		].join(''),
		toys: 'M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2zM3 11l3-5h12l3 5M10 15h4',
		book: 'M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5c-3-.5-6 0-8 1.5zM12 6v14.5',
		plate: [circle(14, 12, 6), circle(14, 12, 2.5), 'M4 4v5a2 2 0 002 2v9M6 4v5'].join(''),
		bin: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6'
	};
</script>

<svg
	aria-hidden="true"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke={colour}
	stroke-width="2.2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class="flex-none"
>
	<path d={DRAWINGS[icon]} />
</svg>
