<script lang="ts">
	// New chore (Add-Stop.dc.html). Every child is ticked and the first picture
	// is chosen to start with.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ChoreForm from '#lib/components/ChoreForm.svelte';
	import { CHORE_STARS } from '#lib/chore-icons.ts';
	import type { ChoreFields, Kid } from '#lib/chores.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	let kids = $state<Kid[] | null>(null);

	onMount(async () => {
		const res = await grownupFetch('/api/grown-up/chores');
		if (res.ok) kids = ((await res.json()) as { children: Kid[] }).children;
	});

	async function save(chore: ChoreFields) {
		const res = await grownupFetch('/api/grown-up/chores', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(chore)
		});
		if (!res.ok) return false;
		const { id } = (await res.json()) as { id: number };
		await goto(`/grown-up/chores?added=${id}`);
		return true;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: New chore</title>
</svelte:head>

<BackHeader href="/grown-up/chores" label="Chores" />

{#if kids}
	<ChoreForm
		title="New chore"
		submitLabel="Add chore"
		{kids}
		initial={{
			name: '',
			icon: 'bed',
			stars: CHORE_STARS.start,
			childIds: kids.map((k) => k.id),
			repeat: { kind: 'daily' }
		}}
		onsave={save}
	/>
{/if}
