<script lang="ts">
	// Add a child: the Child-Edit form with nothing filled in. The passcode can be
	// set from Edit once the child exists.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ChildForm from '#lib/components/ChildForm.svelte';
	import { saveChild } from '#lib/children-client.ts';
	import { COLOURS, type ColourId } from '#lib/colours.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	let taken = $state<ColourId[] | null>(null);
	onMount(async () => {
		const res = await grownupFetch('/api/grown-up/children');
		if (res.ok) taken = ((await res.json()) as { takenColours: ColourId[] }).takenColours;
	});

	async function save(child: { name: string; colour: ColourId }) {
		const message = await saveChild(null, child);
		if (!message) await goto('/grown-up/settings/children');
		return message;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Add a child</title>
</svelte:head>

<BackHeader href="/grown-up/settings/children" label="Children" />
{#if taken}
	{@const used = taken}
	<ChildForm
		title="Add a child"
		start={{ name: '', colour: COLOURS.find((c) => !used.includes(c.id))?.id ?? COLOURS[0].id }}
		taken={used}
		onsave={save}
	/>
{/if}
