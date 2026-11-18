<script lang="ts">
	// "Remove Leo's photo?" (Child-Photo-Remove-Confirm.dc.html).
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import { fetchChild, removeChildPhoto, type ChildDetail } from '#lib/children-client.ts';

	let child = $state<ChildDetail | null>(null);
	let missing = $state(false);
	let message = $state('');
	let removing = $state(false);
	const editHref = $derived(`/grown-up/settings/children/${page.params.id}`);

	onMount(async () => {
		child = await fetchChild(page.params.id);
		missing = !child;
	});

	async function remove(id: number) {
		if (removing) return;
		removing = true;
		message = (await removeChildPhoto(id)) ?? '';
		removing = false;
		if (!message) await goto(editHref);
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Remove photo</title>
</svelte:head>

<BackHeader href={editHref} label="Back" />

{#if missing}
	<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Child not found</h1>
{:else if child}
	{@const c = child}
	<div class="flex justify-center">
		<Rocket colour={c.colour} rank={c.rank} photo={c.photo} height={110} />
	</div>
	<h1 class="m-0 text-center font-heading text-[34px] leading-[1.05] font-normal">
		Remove {c.name}’s photo?
	</h1>
	<p class="m-0 text-center text-[16px] leading-[1.45] font-bold text-muted">
		The rocket goes back to its plain window. {c.name} can add a new photo any time.
	</p>
	{#if message}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{message}</p>
	{/if}
	<div class="mt-2.5 flex flex-col gap-2.5">
		<button
			type="button"
			disabled={removing}
			onclick={() => remove(c.id)}
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-[#7A3A4A] font-heading text-[19px] text-danger"
			>Yes, remove photo</button
		>
		<a
			href={editHref}
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
			>Keep photo</a
		>
	</div>
{/if}
