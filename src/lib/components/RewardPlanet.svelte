<script lang="ts">
	// A reward's planet in its colour (Rewards.dc.html, Add-Reward.dc.html),
	// with a tick badge when a child can claim it.
	import Planet from '#lib/components/Planet.svelte';
	import { planet, type PlanetId } from '#lib/reward-planets.ts';

	let {
		colour,
		size = 56,
		ready = false
	}: { colour: PlanetId; size?: number; ready?: boolean } = $props();
	const look = $derived(planet(colour));
</script>

<span class="relative block flex-none" style="width:{size}px;height:{size}px">
	<Planet {size} body={look.body} spots={look.spots} ring={look.ring} />
	{#if ready}
		<span
			aria-hidden="true"
			class="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-ok text-ink-on-teal"
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="3.4"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
			>
		</span>
	{/if}
</span>
