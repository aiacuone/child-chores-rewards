<script lang="ts">
	// New reward (Add-Reward.dc.html). Every child is ticked and the pink planet
	// is chosen to start with.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import RewardForm from '#lib/components/RewardForm.svelte';
	import type { Kid } from '#lib/chores.ts';
	import { REWARD_COST, type RewardFields } from '#lib/rewards.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	let kids = $state<Kid[] | null>(null);

	onMount(async () => {
		const res = await grownupFetch('/api/grown-up/rewards');
		if (res.ok) kids = ((await res.json()) as { children: Kid[] }).children;
	});

	async function save(reward: RewardFields) {
		const res = await grownupFetch('/api/grown-up/rewards', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(reward)
		});
		if (!res.ok) return null;
		return ((await res.json()) as { id: number }).id;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: New reward</title>
</svelte:head>

{#if kids}
	<RewardForm
		title="New reward"
		submitLabel="Add reward"
		{kids}
		initial={{
			name: '',
			cost: REWARD_COST.start,
			colour: 'pink',
			childIds: kids.map((k) => k.id)
		}}
		onsave={save}
		onsaved={(id) => goto(`/grown-up/rewards?added=${id}`)}
		onphotofailed={(id) => goto(`/grown-up/rewards/${id}/edit?photo=failed`)}
	/>
{/if}
