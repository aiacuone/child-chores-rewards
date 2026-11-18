<script lang="ts">
	// Edit chore (Edit-Stop.dc.html). Saving goes back to the chore with "Saved",
	// and "· now repeats …" when the repeat changed (Stop-Parent-Saved.dc.html).
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ChoreForm from '#lib/components/ChoreForm.svelte';
	import { choreFields, type ChoreFields, type ChoreRow, type Kid } from '#lib/chores.ts';
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
		return res.ok ? Number(id) : null;
	}

	function saved(_id: number, fields: ChoreFields) {
		const repeatChanged = JSON.stringify(fields.repeat) !== JSON.stringify(choreFields(chore!).repeat);
		return goto(`/grown-up/chores/${id}?saved${repeatChanged ? '=repeat' : ''}`);
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Edit chore</title>
</svelte:head>

{#if missing}
	<p class="m-0 text-[18px] text-muted">Not found.</p>
{:else if chore}
	<ChoreForm
		title="Edit chore"
		submitLabel="Save changes"
		{kids}
		initial={choreFields(chore)}
		photo={chore.photo}
		backHref="/grown-up/chores/{id}"
		photoProblem={page.url.searchParams.get('photo') === 'failed'}
		onsave={save}
		onsaved={saved}
	/>
{/if}
