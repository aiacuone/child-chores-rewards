<script lang="ts">
	// The top of each setup step: a back arrow (left out on step 1), the step bar
	// and "1 of 4", as in Setup-Children.dc.html and Setup-PIN.dc.html. The bar has
	// five parts as drawn; the step count is also given in words.
	let { step, back }: { step: number; back?: string } = $props();
</script>

<div class="flex min-h-12 items-center gap-3.5">
	{#if back}
		<a
			href={back}
			aria-label="Back"
			class="flex size-12 flex-none items-center justify-center rounded-full bg-card text-ink"
		>
			<svg
				aria-hidden="true"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M15 5l-7 7 7 7" /></svg
			>
		</a>
	{/if}
	<span class="flex flex-1 gap-[5px]" role="img" aria-label="Step {step} of 4">
		{#each [1, 2, 3, 4, 5] as n (n)}
			<span class={['h-2 flex-1 rounded-full', n <= step ? 'bg-ok' : 'bg-track']}></span>
		{/each}
	</span>
	<span aria-hidden="true" class="text-[14px] font-black text-muted">{step} of 4</span>
</div>
