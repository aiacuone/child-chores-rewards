<script lang="ts">
	// My rewards (Child-Rewards.dc.html): each reward for this child with a
	// labelled meter, and "Ready to claim!" in words when they have enough.
	// Temporary fix: no Claim button until #27.
	import BackArrow from '#lib/components/BackArrow.svelte';
	import RewardPlanet from '#lib/components/RewardPlanet.svelte';
	import StarCount from '#lib/components/StarCount.svelte';
	import { meter } from '#lib/rewards.ts';

	let { data } = $props();
	const child = $derived(data.child);
</script>

<svelte:head>
	<title>Rocket Rewards: My rewards</title>
</svelte:head>

<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-3.5 px-[22px] pt-[26px] pb-10">
	<BackArrow href="/trip/{child.id}" />
	<div class="flex items-center justify-between gap-3">
		<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">My rewards</h1>
		<span class="inline-flex min-h-11 items-center rounded-full bg-card px-3.5 text-[16px]">
			<StarCount stars={child.stars} size={18} />
		</span>
	</div>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		Spend your stars on a reward. A grown-up hands it out.
	</p>

	{#if data.rewards.length === 0}
		<p class="m-0 text-[16px] font-bold text-muted">No rewards yet. A grown-up can add some.</p>
	{/if}

	<ul class="m-0 flex list-none flex-col gap-2.5 p-0">
		{#each data.rewards as reward (reward.id)}
			{@const m = meter(reward.stars, reward.cost)}
			<li
				class={[
					'flex items-center gap-3 rounded-[20px] border-2 py-3 pr-3.5 pl-2.5',
					m.ready
						? 'border-ok bg-ok/10 shadow-[0_0_0_3px_rgba(94,214,196,0.18)]'
						: 'border-line bg-card'
				]}
			>
				<RewardPlanet colour={reward.colour} ready={m.ready} />
				<span class="flex min-w-0 flex-1 flex-col gap-1.5">
					<span class="flex items-center gap-1.5">
						<span class="flex-1 font-heading text-[20px]">{reward.name}</span>
						<StarCount stars={reward.cost} size={15} />
					</span>
					<span
						role="progressbar"
						aria-label={reward.name}
						aria-valuemin={0}
						aria-valuemax={reward.cost}
						aria-valuenow={Math.min(reward.stars, reward.cost)}
						aria-valuetext={m.ready
							? 'Ready to claim'
							: `${reward.stars} of ${reward.cost} stars, ${m.toGo} to go`}
						class="h-3 overflow-hidden rounded-full bg-track"
					>
						<span
							class="block h-full rounded-full {m.ready ? 'bg-ok' : 'bg-amber'}"
							style="width:{m.percent}%"
						></span>
					</span>
					<span class="text-[13px] font-extrabold text-muted">
						{#if m.ready}
							<span class="font-black text-ok">Ready to claim!</span>
						{:else}
							<b class="text-ink">{m.toGo}</b> stars to go
						{/if}
					</span>
				</span>
			</li>
		{/each}
	</ul>
</div>
