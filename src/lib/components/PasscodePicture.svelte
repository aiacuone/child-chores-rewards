<script lang="ts">
	// One of the nine passcode pictures (Passcode-Setup, Passcode-Enter). Always
	// decorative: the button or slot around it carries the name.
	import Rocket from '#lib/components/Rocket.svelte';
	import type { PictureId } from '#lib/passcode.ts';

	let { picture, size = 40 }: { picture: PictureId; size?: number } = $props();

	const circle = (x: number, y: number, r: number) =>
		`M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
	const oval = (x: number, y: number, rx: number, ry: number) =>
		`M${x - rx} ${y}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`;

	const LINE_DRAWINGS: Partial<Record<PictureId, string>> = {
		book: 'M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5c-3-.5-6 0-8 1.5z M12 6v14.5',
		paw: [
			oval(12, 16, 4, 3.5),
			circle(6, 11, 1.8),
			circle(9.5, 6.5, 1.8),
			circle(14.5, 6.5, 1.8),
			circle(18, 11, 1.8)
		].join(' '),
		toys: 'M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z M3 11l3-5h12l3 5 M10 15h4',
		plate: `${circle(14, 12, 6)} ${circle(14, 12, 2.5)} M4 4v5a2 2 0 002 2v9M6 4v5`,
		car: `M3 16v-4l2.5-5h13l2.5 5v4z ${circle(7, 16.5, 2)} ${circle(17, 16.5, 2)}`,
		gift: 'M5 9h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z M3 13h18M12 9v12 M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z'
	};
	const line = $derived(LINE_DRAWINGS[picture]);
</script>

{#if picture === 'rocket'}
	<Rocket colour="#F3F4FF" height={size} />
{:else if picture === 'star'}
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="var(--color-amber)"
		stroke="var(--color-amber)"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		><path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" /></svg
	>
{:else if picture === 'planet'}
	<svg aria-hidden="true" width={size * 1.1} height={size * 1.1} viewBox="0 0 100 100">
		<circle cx="50" cy="50" r="34" fill="#9C8CF0" /><circle cx="38" cy="40" r="7" fill="#7f72c4" />
		<circle cx="60" cy="62" r="9" fill="#7f72c4" />
		<ellipse
			cx="50"
			cy="50"
			rx="48"
			ry="12"
			fill="none"
			stroke="#bba8ff"
			stroke-width="5"
			transform="rotate(-18 50 50)"
		/>
	</svg>
{:else}
	<svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="var(--color-ink)"
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"><path d={line} /></svg
	>
{/if}
