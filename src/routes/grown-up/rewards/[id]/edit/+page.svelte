<script lang="ts">
	// Edit reward: the New reward form with the reward's values, and Remove
	// reward below it as on a chore (not designed; decided in #26). Saving goes
	// back to the Rewards tab with "<name> saved".
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ConfirmCard from '#lib/components/ConfirmCard.svelte';
	import RewardForm from '#lib/components/RewardForm.svelte';
	import { SAVE_FAILED, type Kid } from '#lib/chores.ts';
	import type { RewardFields } from '#lib/rewards.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	const id = $derived(page.params.id);
	let kids = $state<Kid[]>([]);
	let reward = $state<(RewardFields & { id: number }) | null>(null);
	let missing = $state(false);
	let confirming = $state(false);
	let failed = $state(false);

	onMount(async () => {
		const [one, all] = await Promise.all([
			grownupFetch(`/api/grown-up/rewards/${id}`),
			grownupFetch('/api/grown-up/rewards')
		]);
		if (!one.ok || !all.ok) {
			missing = true;
			return;
		}
		kids = ((await all.json()) as { children: Kid[] }).children;
		reward = (await one.json()) as RewardFields & { id: number };
	});

	async function save(fields: RewardFields) {
		const res = await grownupFetch(`/api/grown-up/rewards/${id}`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(fields)
		});
		if (!res.ok) return false;
		await goto(`/grown-up/rewards?saved=${id}`);
		return true;
	}

	async function remove() {
		confirming = false;
		const res = await grownupFetch(`/api/grown-up/rewards/${id}`, { method: 'DELETE' });
		if (res.ok) await goto('/grown-up/rewards');
		else failed = true;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Edit reward</title>
</svelte:head>

<BackHeader href="/grown-up/rewards" label="Rewards" />

{#if missing}
	<p class="m-0 text-[18px] text-muted">Not found.</p>
{:else if reward}
	<RewardForm
		title="Edit reward"
		submitLabel="Save changes"
		{kids}
		initial={{
			name: reward.name,
			cost: reward.cost,
			colour: reward.colour,
			childIds: reward.childIds
		}}
		onsave={save}
	/>

	{#if failed}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>
	{/if}

	<button
		type="button"
		onclick={() => (confirming = true)}
		class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-[#7A3A4A] font-heading text-[19px] text-danger"
		>Remove reward</button
	>

	{#if confirming}
		<ConfirmCard
			title="Remove {reward.name}?"
			text="It goes from every child’s My rewards. Stars stay with the children."
			confirmLabel="Remove reward"
			cancelLabel="Keep it"
			onconfirm={remove}
			oncancel={() => (confirming = false)}
		/>
	{/if}
{/if}
