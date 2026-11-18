<script lang="ts">
	// My rewards (Child-Rewards.dc.html): each reward for this child with a
	// labelled meter, "Ready to claim!" in words and a Claim button when they have
	// enough, "Asked a grown-up!" while one is deciding, and what a grown-up
	// answered once (Child-Rewards-Claimed, Child-Rewards-Declined).
	import BackArrow from '#lib/components/BackArrow.svelte';
	import { asSaid } from '#lib/check.ts';
	import RewardPlanet from '#lib/components/RewardPlanet.svelte';
	import StarCount from '#lib/components/StarCount.svelte';
	import { meter } from '#lib/rewards.ts';

	let { data } = $props();
	const child = $derived(data.child);

	// The answer shows once: tell the server it has been seen, without reloading.
	$effect(() => {
		const notice = data.notice;
		if (!notice) return;
		const body = new FormData();
		body.set('upTo', String(notice.id));
		fetch('?/seen', { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } }).catch(
			() => {}
		);
	});
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
						{#if reward.asked}
							<span class="font-black text-ok">Asked a grown-up!</span>
						{:else if m.ready}
							<span class="font-black text-ok">Ready to claim!</span>
						{:else}
							<b class="text-ink">{m.toGo}</b> stars to go
						{/if}
					</span>
				</span>
				{#if m.ready && !reward.asked}
					<form method="POST" action="?/claim" class="flex-none">
						<input type="hidden" name="reward" value={reward.id} />
						<button
							aria-label="Claim {reward.name}"
							class="flex min-h-12 items-center rounded-full bg-hi px-[18px] font-heading text-[18px] text-ink-on-orange shadow-[0_4px_0_#8c5731]"
							>Claim</button
						>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
</div>

{#if data.notice}
	<div aria-hidden="true" class="h-24"></div>
	<div
		role="status"
		class={[
			'fixed inset-x-0 bottom-6 z-[6] mx-auto flex min-h-[60px] max-w-[350px] items-center gap-3 rounded-[20px] border-2 bg-card px-4 py-1 text-[16px] font-black',
			data.notice.kind === 'handed_out' ? 'border-ok' : 'border-amber'
		]}
		style="width:calc(100% - 40px)"
	>
		{#if data.notice.kind === 'handed_out'}
			<svg
				aria-hidden="true"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="var(--color-ok)"
				stroke-width="2.6"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="flex-none"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
			>
			<span class="flex-1">{data.notice.rewardName} handed out!</span>
			<span class="flex-none rounded-full bg-label px-2.5 py-1 text-[13px] text-amber"
				>−{data.notice.stars} stars</span
			>
		{:else}
			<svg
				aria-hidden="true"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="var(--color-amber)"
				stroke-width="2.2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="flex-none"
				><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M3 13h18M12 9v12" /><path
					d="M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"
				/></svg
			>
			<span class="flex-1"
				>Grown-up says: “{asSaid(data.notice.message ?? '')}” Your stars are safe.</span
			>
		{/if}
	</div>
{/if}
