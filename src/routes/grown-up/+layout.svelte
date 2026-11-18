<script lang="ts">
	// Every grown-up page: the PIN pad until grown-up mode is on, then the page
	// with the grown-up bar and the tab bar. Leaving the grown-up pages locks
	// grown-up mode, so a child handed the device cannot walk back in.
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import GrownupBar from '#lib/components/GrownupBar.svelte';
	import GrownupTabs, { type Tab } from '#lib/components/GrownupTabs.svelte';
	import PinPad from '#lib/components/PinPad.svelte';
	import StarField from '#lib/components/StarField.svelte';
	import { grownup, lock } from '#lib/grownup.svelte.ts';

	let { children } = $props();

	const parts = $derived(page.url.pathname.split('/').filter(Boolean));
	const current = $derived((parts[1] || 'home') as Tab);
	// The tab bar shows on the tab pages themselves, not on a chore or a form (as
	// drawn), and on the star history, which is drawn with it.
	const showTabs = $derived(parts.length <= 2 || parts[1] === 'ranks');

	onDestroy(() => {
		if (grownup.token) lock({ toWhosFlying: false });
	});
</script>

<main class="relative min-h-screen overflow-hidden">
	<StarField />
	{#if grownup.token}
		<GrownupBar />
		<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-3.5 px-5 pt-[62px] pb-32">
			{@render children()}
		</div>
		{#if showTabs}<GrownupTabs {current} />{/if}
	{:else}
		<div class="relative z-[2] mx-auto max-w-[420px] px-6 pt-[26px] pb-10">
			<PinPad />
		</div>
	{/if}
</main>
