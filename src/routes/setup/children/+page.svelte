<script lang="ts">
	// Setup step 1: "Who's flying?" (design/screens/Setup-Children.dc.html).
	import { enhance } from '$app/forms';
	import SetupHeader from '#lib/components/SetupHeader.svelte';
	import { COLOURS, type ColourId } from '#lib/colours.ts';
	import { MAX_CHILDREN, MAX_NAME } from '#lib/setup-limits.ts';

	let { data, form } = $props();

	const firstFree = (taken: ColourId[]) =>
		COLOURS.find((c) => !taken.includes(c.id))?.id ?? COLOURS[0].id;

	// Start from the children saved earlier (after Back from the PIN step). The
	// rows are then edited here, so later changes to `data` are not copied in.
	const savedRows = () =>
		data.children.length > 0 ? data.children : [{ name: '', colour: COLOURS[0].id }];
	let rows = $state<{ name: string; colour: ColourId }[]>(savedRows());

	function addRow() {
		rows.push({ name: '', colour: firstFree(rows.map((r) => r.colour)) });
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Who’s flying?</title>
</svelte:head>

<SetupHeader step={1} />

<h1 class="m-0 font-heading text-[32px] leading-[1.05] font-normal">Who’s flying?</h1>
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">Add each child and pick a rocket colour.</p>

<div
	class="flex min-h-12 items-center gap-2.5 rounded-2xl border-2 border-ok bg-ok/14 px-3.5 text-[15px] font-black"
>
	<svg
		aria-hidden="true"
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		class="flex-none stroke-ok"
		stroke-width="3"
		stroke-linecap="round"
		stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
	>
	Signed in with Google · {data.email}
</div>

<form method="POST" use:enhance class="flex flex-col gap-4">
	{#each rows as row, i (i)}
		<div class="flex flex-col gap-1.5">
			<label for="name-{i}" class="text-[14px] font-black text-muted">Child {i + 1}</label>
			<input
				id="name-{i}"
				name="name-{i}"
				type="text"
				placeholder="Name"
				maxlength={MAX_NAME}
				autocomplete="off"
				bind:value={row.name}
				class="min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink placeholder:text-muted"
			/>
		</div>
		<fieldset class="m-0 flex gap-2.5 border-0 p-0">
			<legend class="sr-only">Child {i + 1} rocket colour</legend>
			{#each COLOURS as c (c.id)}
				<label class="relative block size-11 cursor-pointer">
					<input
						type="radio"
						name="colour-{i}"
						value={c.id}
						bind:group={row.colour}
						aria-label={c.label}
						class="peer absolute inset-0 m-0 size-full cursor-pointer appearance-none rounded-full"
					/>
					<span
						aria-hidden="true"
						class="pointer-events-none absolute inset-0 rounded-full peer-checked:shadow-[0_0_0_3px_var(--color-bg),0_0_0_5px_var(--color-ink)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[7px] peer-focus-visible:outline-hi"
						style="background:{c.value}"
					></span>
				</label>
			{/each}
		</fieldset>
	{/each}

	{#if rows.length < MAX_CHILDREN}
		<button
			type="button"
			onclick={addRow}
			class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] border-2 border-line bg-card font-heading text-[19px] text-ink"
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
			Add another child
		</button>
	{/if}

	{#if form?.message}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{form.message}</p>
	{/if}

	<button
		type="submit"
		class="mt-2.5 flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
	>
		Next
	</button>
</form>
