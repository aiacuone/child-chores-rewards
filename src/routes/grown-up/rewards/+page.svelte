<script lang="ts">
	// The Rewards tab (Rewards.dc.html, Rewards-Added.dc.html, Rewards-Claimed,
	// Rewards-Declined): every reward with a labelled meter for each child it is
	// for. A reward with a claim waiting opens its hand-out; any other opens Edit.
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import DoneNotice from '#lib/components/DoneNotice.svelte';
	import LiveUpdates from '#lib/components/LiveUpdates.svelte';
	import RewardPlanet from '#lib/components/RewardPlanet.svelte';
	import { fetchClaim, type ClaimView } from '#lib/claim-client.ts';
	import { meter, type RewardSummary } from '#lib/rewards.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	let rewards = $state<RewardSummary[] | null>(null);
	let version = $state<number | null>(null);

	const addedId = $derived(Number(page.url.searchParams.get('added')) || null);
	const savedId = $derived(Number(page.url.searchParams.get('saved')) || null);
	const added = $derived(rewards?.find((r) => r.id === addedId) ?? null);
	const saved = $derived(rewards?.find((r) => r.id === savedId) ?? null);

	// The notice after answering a claim: ?handed=<claim> or ?declined=<claim>.
	let answered = $state<ClaimView | null>(null);
	const answeredKind = $derived(
		page.url.searchParams.has('handed')
			? 'handed'
			: page.url.searchParams.has('declined')
				? 'declined'
				: null
	);
	$effect(() => {
		const id = answeredKind ? page.url.searchParams.get(answeredKind) : null;
		answered = null;
		if (!id || !/^\d{1,9}$/.test(id)) return;
		fetchClaim(id).then((found) => (answered = found));
	});

	async function load() {
		const res = await grownupFetch('/api/grown-up/rewards');
		if (!res.ok) return;
		const body = (await res.json()) as { version: number; rewards: RewardSummary[] };
		rewards = body.rewards;
		version = body.version;
	}
	onMount(load);
</script>

<svelte:head>
	<title>Rocket Rewards: Rewards</title>
</svelte:head>

{#if version !== null}
	<LiveUpdates {version} onchange={load} />
{/if}

<div class="flex items-center justify-between">
	<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Rewards</h1>
	<a
		href="/grown-up/rewards/new"
		aria-label="Add reward"
		class="flex size-12 items-center justify-center rounded-full bg-hi text-ink-on-orange"
	>
		<svg
			aria-hidden="true"
			width="26"
			height="26"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg
		>
	</a>
</div>

{#if added}
	<DoneNotice text="{added.name} added" />
{:else if saved}
	<DoneNotice text="{saved.name} saved" />
{:else if answeredKind === 'handed' && answered}
	<DoneNotice text="Handed out. {answered.child.name} has {answered.stars} stars left" />
{:else if answeredKind === 'declined' && answered?.message}
	<DoneNotice text="Told {answered.child.name}: “{answered.message}”" />
{/if}

<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
	Children spend stars on rewards. Green means a child has enough stars to claim it.
</p>

{#if rewards}
	{#if rewards.length === 0}
		<p class="m-0 text-[16px] font-bold text-muted">No rewards yet.</p>
	{/if}
	<ul class="m-0 flex list-none flex-col gap-2 p-0">
		{#each rewards as reward (reward.id)}
			{@const meters = reward.children.map((c) => ({ ...c, ...meter(c.stars, reward.cost) }))}
			{@const claimable = meters.some((m) => m.ready)}
			<li>
				<a
					href={reward.waiting
						? `/grown-up/claim/${reward.waiting.claimId}`
						: `/grown-up/rewards/${reward.id}/edit`}
					class={[
						'flex items-center gap-3 rounded-[18px] border-2 py-3 pr-3.5 pl-2.5',
						claimable
							? 'border-ok bg-ok/10 shadow-[0_0_0_3px_rgba(94,214,196,0.18)]'
							: 'border-line bg-card'
					]}
				>
					<RewardPlanet colour={reward.colour} ready={claimable} photo={reward.photo} />
					<span class="flex min-w-0 flex-1 flex-col gap-1.5">
						<span class="flex items-center gap-2">
							<span class="flex-1 text-[16px] font-black">{reward.name}</span>
							{#if claimable || reward.id === addedId}
								<span
									class="inline-flex h-[26px] flex-none items-center rounded-full bg-ok/20 px-2.5 text-[13px] font-black text-ok"
									>{claimable ? 'Claimable' : 'New'}</span
								>
							{/if}
							<span class="flex items-center gap-[3px] font-heading text-[17px] text-amber">
								<svg
									aria-hidden="true"
									width="15"
									height="15"
									viewBox="0 0 24 24"
									fill="currentColor"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path
										d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z"
									/></svg
								>{reward.cost}<span class="sr-only"> stars needed</span>
							</span>
						</span>
						{#each meters as m (m.id)}
							<span class="flex min-h-[22px] items-center gap-2">
								<span
									aria-hidden="true"
									class="size-2 flex-none rounded-full"
									style="background:{m.colour}"
								></span>
								<span class="min-w-[30px] flex-none text-[13px] font-black">{m.name}</span>
								<span
									role="progressbar"
									aria-label="{m.name}’s stars"
									aria-valuemin={0}
									aria-valuemax={reward.cost}
									aria-valuenow={Math.min(m.stars, reward.cost)}
									aria-valuetext={m.ready ? 'Ready' : `${m.toGo} stars to go`}
									class="h-2.5 flex-1 overflow-hidden rounded-full bg-track"
								>
									<span
										class="block h-full rounded-full {m.ready ? 'bg-ok' : 'bg-amber'}"
										style="width:{m.percent}%"
									></span>
								</span>
								<span class="min-w-[62px] flex-none text-right text-[13px]">
									{#if m.ready}
										<span class="inline-flex items-center gap-1 font-black text-ok">
											<svg
												aria-hidden="true"
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="3"
												stroke-linecap="round"
												stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
											>Ready
										</span>
									{:else}
										<span class="font-extrabold text-muted"
											><b class="text-ink">{m.toGo}</b> to go</span
										>
									{/if}
								</span>
							</span>
						{:else}
							<span class="text-[13px] font-bold text-muted">Nobody yet</span>
						{/each}
					</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}
