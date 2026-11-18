<script lang="ts">
	// Set up a picture passcode (Passcode-Setup.dc.html). Tapping a picked picture
	// takes it back. The saved pictures are never sent to the page, so changing a
	// passcode starts from empty.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import PasscodePicture from '#lib/components/PasscodePicture.svelte';
	import {
		fetchChild,
		savePasscode,
		turnOffPasscode,
		type ChildDetail
	} from '#lib/children-client.ts';
	import { PASSCODE_LENGTH, PICTURE_IDS, type PictureId } from '#lib/passcode.ts';

	const ORDER = ['first', 'second', 'third'];

	let child = $state<ChildDetail | null>(null);
	let missing = $state(false);
	let picked = $state<PictureId[]>([]);
	let message = $state('');
	let saving = $state(false);
	const editHref = $derived(`/grown-up/settings/children/${page.params.id}`);
	const full = $derived(picked.length === PASSCODE_LENGTH);

	onMount(async () => {
		child = await fetchChild(page.params.id);
		missing = !child;
	});

	function tap(picture: PictureId) {
		if (picked.includes(picture)) picked = picked.filter((p) => p !== picture);
		else if (!full) picked = [...picked, picture];
	}

	async function run(action: () => Promise<string | null>) {
		if (saving) return;
		saving = true;
		message = (await action()) ?? '';
		saving = false;
		if (!message) await goto(editHref);
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Picture passcode</title>
</svelte:head>

<BackHeader href={editHref} label="Back" />

{#if missing}
	<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Child not found</h1>
{:else if child}
	{@const c = child}
	<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">{c.name}’s pictures</h1>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		{c.name} taps these 3 pictures, in order, to open the trip.
		{#if !full}Pick the {ORDER[picked.length]} one.{/if}
	</p>

	<div class="flex gap-2.5">
		{#each ORDER as place, i (place)}
			<span
				role="img"
				aria-label="{place} picture: {picked[i] ?? 'not picked'}"
				class={[
					'flex min-h-16 flex-1 items-center justify-center rounded-[18px] border-[3px] border-dashed',
					i === picked.length ? 'border-ok' : 'border-line'
				]}
			>
				{#if picked[i]}<PasscodePicture picture={picked[i]} size={32} />{/if}
			</span>
		{/each}
	</div>

	<div class="grid grid-cols-3 gap-2.5">
		{#each PICTURE_IDS as picture (picture)}
			<button
				type="button"
				aria-label={picture}
				aria-pressed={picked.includes(picture)}
				onclick={() => tap(picture)}
				class={[
					'flex min-h-[84px] items-center justify-center rounded-[22px] border-[3px] bg-card',
					picked.includes(picture) ? 'border-ok' : 'border-transparent'
				]}
			>
				<PasscodePicture {picture} />
			</button>
		{/each}
	</div>

	{#if message}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{message}</p>
	{/if}

	<button
		type="button"
		disabled={!full || saving}
		onclick={() => run(() => savePasscode(c.id, picked))}
		class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731] disabled:opacity-50"
		>Save passcode</button
	>
	{#if c.passcode}
		<button
			type="button"
			disabled={saving}
			onclick={() => run(() => turnOffPasscode(c.id))}
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-[#7A3A4A] font-heading text-[19px] text-danger"
			>Turn off passcode</button
		>
	{/if}
{/if}
