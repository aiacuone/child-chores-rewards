<script lang="ts">
	// "Remove Leo?" (Child-Remove.dc.html), worded without his or her.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import { fetchChild, removeChild, type ChildDetail } from '#lib/children-client.ts';

	let child = $state<ChildDetail | null>(null);
	let missing = $state(false);
	let message = $state('');
	let removing = $state(false);
	const editHref = $derived(`/grown-up/settings/children/${page.params.id}`);

	onMount(async () => {
		child = await fetchChild(page.params.id);
		missing = !child;
	});

	async function remove(c: ChildDetail) {
		if (removing) return;
		removing = true;
		message = (await removeChild(c.id)) ?? '';
		removing = false;
		if (!message) await goto('/grown-up/settings/children', { state: { removed: c.name } });
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Remove child</title>
</svelte:head>

<BackHeader href={editHref} label="Back" />

{#if missing}
	<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Child not found</h1>
{:else if child}
	{@const c = child}
	<div class="flex justify-center"><Rocket colour={c.colour} rank={c.rank} height={110} /></div>
	<h1 class="m-0 text-center font-heading text-[34px] leading-[1.05] font-normal">
		Remove {c.name}?
	</h1>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		{c.name}’s trip, {c.stars}
		{c.stars === 1 ? 'star' : 'stars'} and rank will be deleted. The chores stay in the list. This can’t
		be undone.
	</p>
	{#if message}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{message}</p>
	{/if}
	<div class="mt-2.5 flex flex-col gap-2.5">
		<button
			type="button"
			disabled={removing}
			onclick={() => remove(c)}
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-[#7A3A4A] font-heading text-[19px] text-danger"
			>Yes, remove {c.name}</button
		>
		<a
			href={editHref}
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
			>Cancel</a
		>
	</div>
{/if}
