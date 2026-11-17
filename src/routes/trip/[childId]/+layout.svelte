<script lang="ts">
	// What every page of a child's trip shares: the stars, the child's colour
	// along the top, and the return to Who's flying when nobody touches it.
	import StarField from '#lib/components/StarField.svelte';
	import StillThere from '#lib/components/StillThere.svelte';

	let { data, children } = $props();
	const child = $derived(data.child);
</script>

<main class="relative min-h-screen overflow-hidden">
	<StarField />
	<div
		aria-hidden="true"
		class="absolute inset-x-0 top-0 z-[5] h-2"
		style="background:{child.colour}"
	></div>
	{@render children()}
</main>

<StillThere name={child.name} colour={child.colour} rank={child.rank} />
