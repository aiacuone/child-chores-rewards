<script lang="ts">
	// Who really did it? (Reassign.dc.html). The stars go to the child picked;
	// the marker's stop opens again. A picked child who has their own copy of
	// the chore sees it Done; one who does not only gets the stars (decided in
	// #24). The design's "goes back to her trip" is "opens again on the trip",
	// because children have no pronouns stored.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { answer, fetchCheck, type CheckView } from '#lib/check-client.ts';

	const copyId = $derived(page.params.copyId!);
	let check = $state<CheckView | null>(null);
	let missing = $state(false);
	let busy = $state(false);
	let failed = $state(false);

	onMount(async () => {
		const found = await fetchCheck(copyId);
		if (!found) missing = true;
		else if (found.status !== 'waiting') await goto('/grown-up/chores', { replaceState: true });
		else check = found;
	});

	async function move(childId: number) {
		busy = true;
		failed = false;
		if (await answer(copyId, { action: 'move', childId })) {
			await goto(`/grown-up/chores?moved=${copyId}&to=${childId}`);
		} else {
			failed = true;
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Wrong child</title>
</svelte:head>

<BackHeader href="/grown-up/check/{copyId}" label="Back" />

{#if missing}
	<p class="m-0 text-[18px] text-muted">Not found.</p>
{:else if check}
	{@const marker = check.child}
	<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Who really did it?</h1>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		{check.chore.name} was marked done on {marker.name}’s trip.
	</p>

	{#each check.children as child (child.id)}
		{@const marked = child.id === marker.id}
		{@const tint = marked ? 'var(--color-muted)' : child.colour}
		{#snippet row()}
			<Rocket colour={child.colour} rank={child.rank} height={56} />
			<span class="flex-1 font-heading text-[22px]">{child.name}</span>
			<span
				class="inline-flex h-[26px] flex-none items-center rounded-full px-2.5 text-[13px] font-black"
				style="background:color-mix(in srgb, {tint} 20%, transparent);color:{tint}"
				>{marked ? 'Marked by' : 'Move here'}</span
			>
		{/snippet}
		{#if marked}
			<div
				class="flex min-h-[70px] items-center gap-3.5 rounded-[18px] border-2 bg-card px-4"
				style="border-color:{child.colour}"
			>
				{@render row()}
			</div>
		{:else}
			<button
				type="button"
				disabled={busy}
				onclick={() => move(child.id)}
				class="flex min-h-[70px] items-center gap-3.5 rounded-[18px] border-2 bg-card px-4 text-left text-ink disabled:opacity-70"
				style="border-color:{child.colour}"
			>
				{@render row()}
			</button>
		{/if}
	{/each}

	{#if failed}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>
	{/if}

	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		Stars go to the child you pick. {marker.name}’s stop opens again on the trip.
	</p>
{/if}
