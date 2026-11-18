<script lang="ts">
	// The Ranks tab (Ranks.dc.html, R-Ranks.dc.html): every child's rocket and
	// rank, the rank ladder for one child, and the link to their star history.
	// The design shows the ladder for the first child; tapping another child's
	// tile shows theirs.
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import LiveUpdates from '#lib/components/LiveUpdates.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import { grownupFetch } from '#lib/grownup.svelte.ts';
	import { RANKS, rankFor } from '#lib/ranks.ts';
	import type { ChildCard } from '#lib/server/flying.ts';

	let version = $state<number | null>(null);
	let children = $state<ChildCard[] | null>(null);

	async function load() {
		const res = await grownupFetch('/api/grown-up/ranks');
		if (!res.ok) return;
		const body = (await res.json()) as { version: number; children: ChildCard[] };
		version = body.version;
		children = body.children;
	}
	onMount(load);

	const who = $derived(Number(page.url.searchParams.get('who')));
	const chosen = $derived(children?.find((c) => c.id === who) ?? children?.[0] ?? null);
	const current = $derived(chosen ? rankFor(chosen.stars).rank : null);
</script>

<svelte:head>
	<title>Rocket Rewards: Ranks</title>
</svelte:head>

<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Ranks</h1>

{#if children && version !== null}
	<LiveUpdates {version} onchange={load} />

	{#if chosen && current}
		<div class="grid grid-cols-2 gap-2.5">
			{#each children as child (child.id)}
				<a
					href="/grown-up/ranks?who={child.id}"
					aria-current={child.id === chosen.id ? 'true' : undefined}
					class={[
						'flex flex-col items-center gap-1 rounded-[18px] bg-card p-3.5',
						child.id === chosen.id && children.length > 1 && 'outline-2 outline-offset-0 outline-ok'
					]}
				>
					<Rocket colour={child.colour} rank={child.rank} photo={child.photo} height={70} />
					<span class="font-heading text-[22px]">{child.name}</span>
					<span class="text-[13px] font-black text-ok">{child.rank}</span>
					<span class="text-[13px] font-extrabold text-amber">{child.stars} stars</span>
				</a>
			{/each}
		</div>

		<div class="text-[13px] font-black tracking-[.06em] text-muted uppercase">
			Rank ladder · {chosen.name}
		</div>
		<ol class="m-0 flex list-none flex-col gap-1.5 p-0">
			{#each RANKS as rank (rank.name)}
				{@const here = rank.name === current}
				<li
					aria-current={here ? 'true' : undefined}
					class={[
						'flex min-h-24 items-center gap-3.5 rounded-2xl px-3.5',
						here ? 'border-2 border-ok bg-ok/14' : 'bg-card'
					]}
				>
					<span class="flex w-14 justify-center">
						<Rocket colour={chosen.colour} rank={rank.name} height={84} />
					</span>
					<span class="flex flex-1 flex-col">
						<span class="text-[18px] font-black">{rank.name}</span>
						<span class="text-[13px] font-extrabold text-muted">{rank.perk}</span>
					</span>
					<span class="font-extrabold text-amber">{rank.min} stars</span>
				</li>
			{/each}
		</ol>

		<a
			href="/grown-up/ranks/{chosen.id}/history"
			class="flex min-h-[60px] items-center gap-3 rounded-[18px] bg-card py-0 pr-3.5 pl-2.5"
		>
			<span class="flex size-10 flex-none items-center justify-center rounded-xl bg-label text-amber">
				<svg
					aria-hidden="true"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.4"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" /></svg
				>
			</span>
			<span class="flex-1">
				<span class="block text-[16px] font-black">Star history</span>
				<span class="mt-0.5 block text-[13px] font-bold text-muted"
					>Every star {chosen.name} earned and spent</span
				>
			</span>
			<svg
				aria-hidden="true"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="var(--color-muted)"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="flex-none -scale-x-100"><path d="M15 5l-7 7 7 7" /></svg
			>
		</a>
	{:else}
		<p class="m-0 text-[18px] text-muted">No children yet.</p>
	{/if}
{/if}
