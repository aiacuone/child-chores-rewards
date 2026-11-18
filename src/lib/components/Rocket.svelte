<script lang="ts">
	// A child's rocket, drawn as in the screens (design/screens/Ranks.dc.html).
	// It keeps the child's colour and gains parts with each rank. Rockets shorter
	// than 40 px always show the plain Cadet rocket (docs/SPEC.md, ranks).
	import { RANKS, type RankName } from '#lib/ranks.ts';

	let {
		colour,
		rank = 'Cadet',
		height = 84,
		rotate = 0,
		label,
		photo = null
	}: {
		/** The child's colour, for example var(--color-mia) or #F28AA0. */
		colour: string;
		rank?: RankName;
		/** Height in px. The width follows the 60 x 110 shape. */
		height?: number;
		/** Tilt in degrees, as on the trip path. */
		rotate?: number;
		/** Read out by screen readers. Leave out when the name is already next to it. */
		label?: string;
		/** The child's photo for the window. If it fails, the plain window stays. */
		photo?: string | null;
	} = $props();

	const clipId = $props.id();
	let failed = $state<string | null>(null);
	const showPhoto = $derived(Boolean(photo) && height >= 40 && failed !== photo);

	const level = $derived(height < 40 ? 0 : RANKS.findIndex((r) => r.name === rank));
	const width = $derived(Math.round((height * 60) / 110));
	const gold = 'var(--color-amber)';
	const flame = 'var(--color-hi)';
	const hull = '#ECEAF6';
	const glass = '#24306A';
</script>

<svg
	{width}
	{height}
	viewBox="0 0 60 110"
	style:transform={rotate ? `rotate(${rotate}deg)` : undefined}
	class="block"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	data-rank={level >= 0 ? RANKS[level].name : 'Cadet'}
>
	{#if level >= 4}
		<g data-part="glow">
			<ellipse cx="30" cy="56" rx="29" ry="52" fill={gold} opacity=".2" />
			<ellipse cx="30" cy="56" rx="22" ry="44" fill={gold} opacity=".16" />
		</g>
	{/if}
	<path d="M21 82Q30 112 39 82z" fill={flame} />
	<path d="M25 82Q30 100 35 82z" fill={gold} />
	<path d="M30 4C46 18 48 44 46 76H14C12 44 14 18 30 4z" fill={hull} />
	<path d="M30 4C40 13 44 26 45 36H15C16 26 20 13 30 4z" fill={colour} />
	<circle cx="30" cy="52" r="9" fill={glass} stroke={colour} stroke-width="4" />
	{#if showPhoto}
		<clipPath id={clipId}><circle cx="30" cy="52" r="10.6" /></clipPath>
		<circle cx="30" cy="52" r="12.2" fill={colour} />
		<image
			data-part="photo"
			href={photo}
			x="19.4"
			y="41.4"
			width="21.2"
			height="21.2"
			preserveAspectRatio="xMidYMid slice"
			clip-path="url(#{clipId})"
			onerror={() => (failed = photo)}
		/>
	{/if}
	<path d="M14 58L2 84L14 80z" fill={colour} />
	<path d="M46 58L58 84L46 80z" fill={colour} />
	{#if level >= 1}
		<g data-part="stripes">
			<rect x="14.2" y="67" width="31.6" height="6" fill={colour} />
			<path d="M12.6 62L9 70L13.6 68.6z" fill="#fff" />
			<path d="M47.4 62L51 70L46.4 68.6z" fill="#fff" />
		</g>
	{/if}
	{#if level >= 2}
		<g data-part="boosters">
			<rect x="7" y="70" width="7" height="19" rx="3.5" fill={hull} stroke={colour} stroke-width="1.4" />
			<rect x="46" y="70" width="7" height="19" rx="3.5" fill={hull} stroke={colour} stroke-width="1.4" />
			<path d="M8.5 90Q10.5 99 12.5 90z" fill={flame} />
			<path d="M47.5 90Q49.5 99 51.5 90z" fill={flame} />
		</g>
	{/if}
	{#if level >= 3}
		<g data-part="gold-trim">
			<path d="M15 35.5H45" stroke={gold} stroke-width="3.2" stroke-linecap="round" />
			<path d="M6.4 74L2 84L10.5 81.6z" fill={gold} />
			<path d="M53.6 74L58 84L49.5 81.6z" fill={gold} />
		</g>
	{/if}
	{#if level >= 4}
		<path
			data-part="star"
			d="M30 19.5L31.9 24.1L36.8 24.4L33 27.5L34.2 32.3L30 29.7L25.8 32.3L27 27.5L23.2 24.4L28.1 24.1z"
			fill={gold}
		/>
	{/if}
</svg>
