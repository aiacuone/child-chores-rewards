<script lang="ts">
	// A reward's planet in its colour (Rewards.dc.html, Add-Reward.dc.html),
	// with a tick badge when a child can claim it, and a round badge for its photo.
	// If the photo fails, the planet stays on its own.
	import { onMount } from 'svelte';
	import Planet from '#lib/components/Planet.svelte';
	import { planet, type PlanetId } from '#lib/reward-planets.ts';

	let {
		colour,
		size = 56,
		ready = false,
		photo = null
	}: { colour: PlanetId; size?: number; ready?: boolean; photo?: string | null } = $props();
	const look = $derived(planet(colour));
	let failed = $state<string | null>(null);
	const badge = $derived(Math.round(size * 0.47));
	let image = $state<HTMLImageElement>();

	// A photo that failed before this page came alive fires no event.
	onMount(() => {
		if (image?.complete && image.naturalWidth === 0) failed = photo;
	});
</script>

<span class="relative block flex-none" style="width:{size}px;height:{size}px">
	<Planet {size} body={look.body} spots={look.spots} ring={look.ring} />
	{#if photo && failed !== photo}
		<span
			class="absolute -right-1.5 -bottom-1 rounded-full border-[3px] bg-bg leading-[0] shadow-[0_0_0_3px_var(--color-bg)]"
			style:border-color={look.body}
		>
			<img
				bind:this={image}
				src={photo}
				alt=""
				width={badge}
				height={badge}
				class="block rounded-full object-cover"
				style:width="{badge}px"
				style:height="{badge}px"
				onerror={() => (failed = photo)}
			/>
		</span>
	{/if}
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
