<script lang="ts">
	// The name and rocket colour of a child (Child-Edit), also used for Add a child.
	import type { Snippet } from 'svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import { COLOURS, colourValue, type ColourId } from '#lib/colours.ts';
	import { MAX_NAME } from '#lib/setup-limits.ts';
	import type { RankName } from '#lib/ranks.ts';

	let {
		title,
		start,
		taken,
		rank,
		onsave,
		rows
	}: {
		title: string;
		start: { name: string; colour: ColourId };
		/** Colours other children have. Each child keeps their own. */
		taken: ColourId[];
		rank?: RankName;
		/** Returns the message to show, or null when saved. */
		onsave: (child: { name: string; colour: ColourId }) => Promise<string | null>;
		/** Rows between the colours and Save. */
		rows?: Snippet;
	} = $props();

	const first = () => start;
	let name = $state(first().name);
	let colour = $state(first().colour);
	let message = $state('');
	let saving = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (saving) return;
		saving = true;
		message = (await onsave({ name, colour })) ?? '';
		saving = false;
	}
</script>

<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">{title}</h1>
<div class="flex justify-center"><Rocket colour={colourValue(colour)} {rank} height={130} /></div>

<form onsubmit={submit} class="flex flex-col gap-3.5">
	<div class="flex flex-col gap-1.5">
		<label for="child-name" class="text-[14px] font-black text-muted">Name</label>
		<input
			id="child-name"
			type="text"
			placeholder="Child’s name"
			maxlength={MAX_NAME}
			autocomplete="off"
			bind:value={name}
			class="min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink placeholder:text-muted"
		/>
	</div>

	<fieldset class="m-0 flex flex-col gap-1.5 border-0 p-0">
		<legend class="mb-1.5 p-0 text-[14px] font-black text-muted">Rocket colour</legend>
		<div class="flex gap-3">
			{#each COLOURS as c (c.id)}
				{@const used = taken.includes(c.id)}
				<label class={['relative block size-[52px]', used ? 'opacity-35' : 'cursor-pointer']}>
					<input
						type="radio"
						name="colour"
						value={c.id}
						disabled={used}
						bind:group={colour}
						aria-label={used ? `${c.label}, used by another child` : c.label}
						class="peer absolute inset-0 m-0 size-full appearance-none rounded-full"
					/>
					<span
						aria-hidden="true"
						class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full text-[26px] font-black text-bg peer-checked:shadow-[0_0_0_4px_var(--color-bg),0_0_0_7px_var(--color-ink)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[9px] peer-focus-visible:outline-hi"
						style="background:{c.value}">{used ? '×' : ''}</span
					>
				</label>
			{/each}
		</div>
	</fieldset>

	{@render rows?.()}

	{#if message}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{message}</p>
	{/if}

	<button
		type="submit"
		disabled={saving}
		class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
		>Save</button
	>
</form>
