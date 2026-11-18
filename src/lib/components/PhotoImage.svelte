<script lang="ts">
	// A photo, or the given fallback when there is none or it fails to load.
	import { onMount, type Snippet } from 'svelte';

	let {
		src,
		size,
		radius = '0',
		fallback,
		loading
	}: {
		src: string | null;
		size: number;
		radius?: string;
		fallback: Snippet;
		/** Shown until the photo arrives (Stop-Photo-Loading). */
		loading?: Snippet;
	} = $props();

	let failed = $state<string | null>(null);
	let loaded = $state<string | null>(null);
	let image = $state<HTMLImageElement>();

	// A photo that finished before this page came alive fires no event.
	onMount(() => {
		if (!image?.complete) return;
		if (image.naturalWidth > 0) loaded = src;
		else failed = src;
	});
	const waiting = $derived(Boolean(loading) && loaded !== src);
</script>

{#if !src || failed === src}
	{@render fallback()}
{:else}
	{#if waiting}{@render loading?.()}{/if}
	<img
		bind:this={image}
		{src}
		alt=""
		width={size}
		height={size}
		class={['flex-none object-cover', waiting ? 'hidden' : 'block']}
		style:border-radius={radius}
		style:width="{size}px"
		style:height="{size}px"
		onload={() => (loaded = src)}
		onerror={() => (failed = src)}
	/>
{/if}
