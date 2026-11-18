<script lang="ts">
	// Children (Settings-Children.dc.html, Children-Removed.dc.html).
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import DoneNotice from '#lib/components/DoneNotice.svelte';
	import LiveUpdates from '#lib/components/LiveUpdates.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import StarCount from '#lib/components/StarCount.svelte';
	import type { ChildRow } from '#lib/children-client.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	type Loaded = { version: number; children: ChildRow[]; canAdd: boolean };
	let loaded = $state<Loaded | null>(null);

	async function load() {
		const res = await grownupFetch('/api/grown-up/children');
		if (res.ok) loaded = (await res.json()) as Loaded;
	}
	onMount(load);
</script>

<svelte:head>
	<title>Rocket Rewards: Children</title>
</svelte:head>

<BackHeader href="/grown-up/settings" label="Settings" />
<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Children</h1>

{#if page.state.removed}
	<DoneNotice text="{page.state.removed} was removed" />
{/if}

{#if loaded}
	<LiveUpdates version={loaded.version} onchange={load} />
	{#each loaded.children as child (child.id)}
		<a
			href="/grown-up/settings/children/{child.id}"
			class="flex min-h-[76px] items-center gap-3.5 rounded-[18px] bg-card px-3.5"
		>
			<Rocket colour={child.colour} rank={child.rank} photo={child.photo} height={50} />
			<span class="min-w-0 flex-1">
				<span class="block font-heading text-[22px]">{child.name}</span>
				<span class="block text-[13px] font-bold text-muted"
					>{child.rank} · <StarCount stars={child.stars} /></span
				>
			</span>
			<span
				class="inline-flex h-[26px] flex-none items-center rounded-full bg-hi/20 px-2.5 text-[13px] font-black text-hi"
				>Edit</span
			>
		</a>
	{/each}

	{#if loaded.canAdd}
		<a
			href="/grown-up/settings/children/new"
			class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
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
				stroke-linejoin="round"
				class="flex-none"><path d="M12 5v14M5 12h14" /></svg
			>Add a child
		</a>
	{/if}
{/if}
