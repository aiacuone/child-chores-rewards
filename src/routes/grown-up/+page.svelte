<script lang="ts">
	// Mission control (Parent-Home.dc.html): today's progress, the chores to
	// check, the rewards to hand out, and each child's trip.
	import { onMount } from 'svelte';
	import LiveUpdates from '#lib/components/LiveUpdates.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import { grownupFetch } from '#lib/grownup.svelte.ts';
	import type { ChildCard } from '#lib/server/flying.ts';
	import type { StopState } from '#lib/server/trip.ts';
	import type { toCheck } from '#lib/server/check.ts';
	import type { waitingClaims } from '#lib/server/claims.ts';

	type Home = {
		version: number;
		day: string;
		children: (ChildCard & { states: StopState[]; next: string | null; reached: string | null })[];
		checks: ReturnType<typeof toCheck>;
		claims: ReturnType<typeof waitingClaims>;
	};
	let home = $state<Home | null>(null);

	async function load() {
		const res = await grownupFetch('/api/grown-up/home');
		if (res.ok) home = (await res.json()) as Home;
	}
	onMount(load);

	const finished = (s: StopState) => s === 'done' || s === 'waiting';
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
	const BAR = { done: 'bg-ok', waiting: 'bg-amber', next: 'bg-track', open: 'bg-track' } as const;
</script>

<svelte:head>
	<title>Rocket Rewards: Mission control</title>
</svelte:head>

<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Mission control</h1>

{#if home}
	{@const all = home.children.flatMap((c) => c.states)}
	<LiveUpdates version={home.version} onchange={load} />

	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		{home.day} · {all.filter(finished).length} of {plural(all.length, 'stop')} done today
	</p>

	{#if home.checks.length}
		{@const first = home.checks[0]}
		<a
			href={home.checks.length === 1 ? `/grown-up/check/${first.copyId}` : '/grown-up/chores'}
			class="flex min-h-16 items-center gap-3 rounded-[20px] border-2 border-amber bg-amber/16 px-4 py-2"
		>
			<svg
				aria-hidden="true"
				width="26"
				height="26"
				viewBox="0 0 24 24"
				fill="none"
				stroke="var(--color-amber)"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="flex-none"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg
			>
			<span class="min-w-0 flex-1">
				<span class="block text-[16px] font-black">{plural(home.checks.length, 'stop')} to check</span>
				<span class="block text-[13px] font-bold text-muted"
					>{home.checks.map((c) => `${c.childName}: ${c.name}`).join(', ')}</span
				>
			</span>
			<span
				class="inline-flex h-[26px] flex-none items-center rounded-full bg-amber/20 px-2.5 text-[13px] font-black text-amber"
				>Check</span
			>
		</a>
	{/if}

	{#if home.claims.length}
		{@const first = home.claims[0]}
		<a
			href={home.claims.length === 1 ? `/grown-up/claim/${first.claimId}` : '/grown-up/rewards'}
			class="flex min-h-16 items-center gap-3 rounded-[20px] border-2 border-ok bg-ok/14 px-4 py-2"
		>
			<svg
				aria-hidden="true"
				width="26"
				height="26"
				viewBox="0 0 24 24"
				fill="none"
				stroke="var(--color-ok)"
				stroke-width="2.2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="flex-none"
				><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M3 13h18M12 9v12" /><path
					d="M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"
				/></svg
			>
			<span class="min-w-0 flex-1">
				<span class="block text-[16px] font-black"
					>{plural(home.claims.length, 'reward')} to hand out</span
				>
				<span class="block text-[13px] font-bold text-muted"
					>{home.claims.map((c) => `${c.childName}: ${c.rewardName}`).join(', ')}</span
				>
			</span>
			<span
				class="inline-flex h-[26px] flex-none items-center rounded-full bg-ok/20 px-2.5 text-[13px] font-black text-ok"
				>Hand out</span
			>
		</a>
	{/if}

	{#each home.children as child (child.id)}
		{@const done = child.states.filter(finished).length}
		<a
			href="/grown-up/chores?who={child.id}"
			class="flex items-center gap-3 rounded-[22px] bg-card p-3.5"
		>
			<Rocket colour={child.colour} rank={child.rank} height={56} />
			<span class="min-w-0 flex-1">
				<span class="flex justify-between font-heading text-[22px]"
					>{child.name}{#if child.states.length}<span class="text-[18px] text-hi"
							>{done}/{child.states.length}</span
						>{/if}</span
				>
				{#if child.states.length}
					<span
						role="progressbar"
						aria-label="{child.name}’s stops today"
						aria-valuemin={0}
						aria-valuemax={child.states.length}
						aria-valuenow={done}
						aria-valuetext="{done} of {child.states.length} stops done"
						class="mt-2 flex gap-1"
					>
						{#each child.states as state, i (i)}
							<span class="h-2 flex-1 rounded-full {BAR[state]}"></span>
						{/each}
					</span>
				{/if}
				<span class="mt-1.5 block text-[13px] font-extrabold text-muted">
					{#if child.next}
						Next stop: {child.next} · {child.stars} stars saved
					{:else if child.states.length}
						All done today · {child.reached ? `reached ${child.reached}` : `${child.stars} stars saved`}
					{:else}
						Nothing to do today · {child.stars} stars saved
					{/if}
				</span>
			</span>
		</a>
	{/each}

	<div class="grid grid-cols-2 gap-2.5">
		<a
			href="/grown-up/chores/new"
			class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
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
				class="flex-none"><path d="M12 5v14M5 12h14" /></svg
			>Add chore
		</a>
		<a
			href="/grown-up/rewards/new"
			class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
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
				class="flex-none"><path d="M12 5v14M5 12h14" /></svg
			>Add reward
		</a>
	</div>
{/if}
