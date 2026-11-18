<script lang="ts">
	// The Forgot PIN pages sit outside grown-up mode: nobody has the PIN here.
	import StarField from '#lib/components/StarField.svelte';

	let { children } = $props();
</script>

<main class="relative min-h-screen overflow-hidden">
	<StarField />
	<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-4 px-[22px] pt-[26px] pb-10">
		{@render children()}
	</div>
</main>
