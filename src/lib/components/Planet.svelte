<script lang="ts">
	// A decorative planet from the screens (the corner of Who's flying, Setup-Done,
	// Nothing to do today). Colours are given by the caller.
	let {
		size,
		body,
		spots,
		ring
	}: { size: number; body: string; spots: string; ring?: string } = $props();
</script>

<svg aria-hidden="true" width={size} height={size} viewBox="0 0 100 100" class="block">
	<circle cx="50" cy="50" r="34" fill={body} />
	<circle cx="38" cy="40" r="7" fill={spots} />
	<circle cx="60" cy="62" r="9" fill={spots} />
	{#if ring}
		<ellipse
			cx="50"
			cy="50"
			rx="48"
			ry="12"
			fill="none"
			stroke={ring}
			stroke-width="5"
			transform="rotate(-18 50 50)"
		/>
	{/if}
</svg>
