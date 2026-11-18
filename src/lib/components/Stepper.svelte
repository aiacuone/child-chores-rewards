<script lang="ts">
	// A − value + row, as for Stars on New chore (Add-Stop.dc.html).
	let {
		label,
		hint,
		value = $bindable(),
		min,
		max,
		step = 1,
		less,
		more,
		show = (n: number) => String(n)
	}: {
		label: string;
		/** A second line under the label. */
		hint?: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		/** What screen readers say for − and +, for example "Fewer stars". */
		less: string;
		more: string;
		/** How the value is written, for example "15th". */
		show?: (n: number) => string;
	} = $props();

	const id = $props.id();
</script>

<div class="flex min-h-14 items-center gap-3 rounded-2xl bg-card px-3.5">
	<span class="flex-1">
		<span id="{id}-label" class="block font-black">{label}</span>
		{#if hint}<span class="block text-[13px] font-bold text-muted">{hint}</span>{/if}
	</span>
	<button
		type="button"
		aria-label={less}
		disabled={value <= min}
		onclick={() => (value = Math.max(min, value - step))}
		class="flex size-11 items-center justify-center rounded-full bg-label text-[24px] font-black text-ink disabled:opacity-40"
		>−</button
	>
	<output
		aria-labelledby="{id}-label"
		aria-live="polite"
		class="min-w-10 text-center font-heading text-[24px] text-amber">{show(value)}</output
	>
	<button
		type="button"
		aria-label={more}
		disabled={value >= max}
		onclick={() => (value = Math.min(max, value + step))}
		class="flex size-11 items-center justify-center rounded-full bg-label text-ink disabled:opacity-40"
	>
		<svg
			aria-hidden="true"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.4"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg
		>
	</button>
</div>
