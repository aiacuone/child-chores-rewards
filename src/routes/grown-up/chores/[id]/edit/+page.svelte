<script lang="ts">
	// Edit chore (Edit-Stop.dc.html). Temporary fix: no Repeats picker until #21.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ChoreForm from '#lib/components/ChoreForm.svelte';
	import type { ChoreFields, ChoreRow, Kid } from '#lib/chores.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	const id = $derived(page.params.id);
	let kids = $state<Kid[]>([]);
	let chore = $state<ChoreRow | null>(null);
	let missing = $state(false);

	onMount(async () => {
		const [one, all] = await Promise.all([
			grownupFetch(`/api/grown-up/chores/${id}`),
			grownupFetch('/api/grown-up/chores')
		]);
		if (!one.ok || !all.ok) {
			missing = true;
			return;
		}
		kids = ((await all.json()) as { children: Kid[] }).children;
		chore = (await one.json()) as ChoreRow;
	});

	async function save(fields: ChoreFields) {
		const res = await grownupFetch(`/api/grown-up/chores/${id}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(fields)
		});
		if (!res.ok) return false;
		await goto(`/grown-up/chores/${id}?saved`);
		return true;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Edit chore</title>
</svelte:head>

<BackHeader href="/grown-up/chores/{id}" label="Chores" />

{#if missing}
	<p class="m-0 text-[18px] text-muted">Not found.</p>
{:else if chore}
	<ChoreForm
		title="Edit chore"
		submitLabel="Save changes"
		{kids}
		initial={{ name: chore.name, icon: chore.icon, stars: chore.stars, childIds: chore.childIds }}
		onsave={save}
	/>
{/if}
