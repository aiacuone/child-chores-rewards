<script lang="ts">
	// Hand out a reward (Claim-Parent.dc.html). A tap on the reward alert lands
	// here after the PIN. Once the claim is no longer waiting (answered here or by
	// another grown-up), the Rewards tab shows instead.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import LiveUpdates from '#lib/components/LiveUpdates.svelte';
	import RewardPlanet from '#lib/components/RewardPlanet.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { answerClaim, fetchClaim, type ClaimView } from '#lib/claim-client.ts';

	const claimId = $derived(page.params.claimId!);
	let claim = $state<ClaimView | null>(null);
	let missing = $state(false);
	let busy = $state(false);
	let failed = $state(false);

	async function load() {
		const found = await fetchClaim(claimId);
		if (!found) missing = true;
		else if (found.status !== 'waiting') await goto('/grown-up/rewards', { replaceState: true });
		else claim = found;
	}
	onMount(load);

	const short = $derived(claim !== null && claim.stars < claim.reward.cost);

	async function handOut() {
		busy = true;
		failed = false;
		const result = await answerClaim(claimId, { action: 'handOut' });
		if (result === 'ok') {
			await goto(`/grown-up/rewards?handed=${claimId}`);
			return;
		}
		failed = result === 'failed';
		busy = false;
		await load();
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Hand out a reward</title>
</svelte:head>

<BackHeader href="/grown-up" label="Home" />

{#if missing}
	<p class="m-0 text-[18px] text-muted">Not found.</p>
{:else if claim}
	{@const name = claim.child.name}
	<LiveUpdates version={claim.version} onchange={load} />

	<div class="flex justify-center">
		<RewardPlanet colour={claim.reward.colour} size={110} />
	</div>
	<h1 class="m-0 text-center font-heading text-[30px] leading-[1.05] font-normal">
		{claim.reward.name}
	</h1>

	<dl class="m-0 overflow-hidden rounded-[18px] bg-card">
		{#each [['Who', name], ['Costs', `${claim.reward.cost} stars`], [`${name}’s stars`, short ? `${claim.stars}` : `${claim.stars} → ${claim.stars - claim.reward.cost}`]] as [term, value], i (term)}
			<div
				class={[
					'flex min-h-[52px] items-center justify-between px-4 text-[15px]',
					i > 0 && 'border-t border-line'
				]}
			>
				<dt class="font-extrabold text-muted">{term}</dt>
				<dd class="m-0 font-black">{value}</dd>
			</div>
		{/each}
	</dl>

	{#if short}
		<p role="alert" class="m-0 text-[16px] leading-[1.45] font-black text-amber">
			{name} doesn’t have enough stars for this now.
		</p>
	{/if}
	{#if failed}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>
	{/if}

	<div class="mt-1.5 flex flex-col gap-2.5">
		<button
			type="button"
			disabled={busy || short}
			onclick={handOut}
			class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-ok font-heading text-[19px] text-ink-on-teal shadow-[0_5px_0_#33756b] disabled:opacity-60"
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
				class="flex-none"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
			>Yes, I handed it out
		</button>
		<a
			href="/grown-up/claim/{claimId}/decline"
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
			>Not now</a
		>
	</div>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		Stars are only taken when you confirm.
	</p>
{/if}
