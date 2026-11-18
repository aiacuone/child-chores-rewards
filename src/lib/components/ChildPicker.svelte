<script lang="ts">
	// "Who does it?": one button per child, ticked in the child's colour. Used
	// by the chore form and the reward form.
	import type { Kid } from '#lib/chores.ts';

	let {
		kids,
		selected = $bindable()
	}: {
		kids: Kid[];
		/** The ids of the ticked children. */
		selected: number[];
	} = $props();

	const labelId = $props.id();

	function toggle(id: number) {
		selected = selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id];
	}
</script>

<div class="flex flex-col gap-1.5">
	<span id={labelId} class="text-[14px] font-black text-muted">Who does it?</span>
	<div role="group" aria-labelledby={labelId} class="flex flex-wrap gap-2">
		{#each kids as kid (kid.id)}
			{@const on = selected.includes(kid.id)}
			<button
				type="button"
				aria-pressed={on}
				onclick={() => toggle(kid.id)}
				class={[
					'flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 font-black',
					on ? 'text-ink' : 'border-line bg-card text-muted'
				]}
				style={on
					? `border-color:${kid.colour};background:color-mix(in srgb, ${kid.colour} 22%, transparent)`
					: undefined}
			>
				{#if on}
					<svg
						aria-hidden="true"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke={kid.colour}
						stroke-width="3"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="flex-none"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
					>
				{/if}
				{kid.name}
			</button>
		{/each}
	</div>
</div>
