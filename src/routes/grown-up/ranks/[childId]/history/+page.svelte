<script lang="ts">
	// A child's star history (Star-History.dc.html, Star-History-Empty.dc.html):
	// what stands after any undo, grouped by day, newest first. Grown-ups only.
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import LiveUpdates from '#lib/components/LiveUpdates.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import { grownupFetch } from '#lib/grownup.svelte.ts';
	import type { ChildCard } from '#lib/server/flying.ts';
	import type { HistoryDay } from '#lib/server/history.ts';

	type Loaded = { version: number; child: ChildCard; days: HistoryDay[] };
	let loaded = $state<Loaded | null>(null);
	let missing = $state(false);

	async function load() {
		const res = await grownupFetch(`/api/grown-up/history/${page.params.childId}`);
		if (res.status === 404) missing = true;
		else if (res.ok) loaded = (await res.json()) as Loaded;
	}
	onMount(load);

	const minus = (n: number) => `−${Math.abs(n)}`;
</script>

<svelte:head>
	<title>Rocket Rewards: Star history</title>
</svelte:head>

{#if missing}
	<BackHeader href="/grown-up/ranks" label="Ranks" />
	<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Child not found</h1>
{:else if loaded}
	{@const { child, days } = loaded}
	<LiveUpdates version={loaded.version} onchange={load} />
	<BackHeader href="/grown-up/ranks?who={child.id}" label="Ranks" />

	<div class="flex items-center gap-3">
		<Rocket colour={child.colour} rank={child.rank} height={56} />
		<span class="min-w-0 flex-1">
			<h1 class="m-0 font-heading text-[32px] leading-[1.05] font-normal">Star history</h1>
			<span class="mt-0.5 block font-heading text-[22px]" style:color={child.colour}
				>{child.name}</span
			>
		</span>
		<span
			class="inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full bg-card px-3.5 font-black text-amber"
		>
			<svg
				aria-hidden="true"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="currentColor"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" /></svg
			>{child.stars} stars
		</span>
	</div>

	{#if days.length}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex: a keyboard user must be able to scroll the list (as drawn) -->
		<div
			role="region"
			tabindex="0"
			aria-label="Star history, newest first. Scrolls."
			class="-mr-1.5 flex max-h-[470px] flex-col gap-2.5 overflow-y-auto pr-1.5"
		>
			{#each days as day (day.date)}
				<div class="flex flex-col gap-1.5">
					<div
						aria-hidden="true"
						class="pt-1 text-[13px] font-black tracking-[.06em] text-muted uppercase"
					>
						{day.label}
					</div>
					<div role="list" aria-label={day.label} class="flex flex-col gap-1.5">
						{#each day.items as item (item.id)}
							{@const spent = item.amount < 0}
							<div
								role="listitem"
								aria-label="{spent ? 'Spent' : 'Earned'} {Math.abs(item.amount)} stars: {item.name}, {item.time}"
								class="box-border flex min-h-14 items-center gap-2.5 rounded-2xl bg-card py-0 pr-3.5 pl-2"
							>
								<span
									aria-hidden="true"
									class="flex size-[38px] flex-none items-center justify-center rounded-xl bg-label"
								>
									{#if spent}
										<svg
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="var(--color-muted)"
											stroke-width="2.2"
											stroke-linecap="round"
											stroke-linejoin="round"
											><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M3 13h18M12 9v12" /><path
												d="M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"
											/></svg
										>
									{:else}
										<svg
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="var(--color-amber)"
											stroke="var(--color-amber)"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											><path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" /></svg
										>
									{/if}
								</span>
								<span class="min-w-0 flex-1">
									<span class="block text-[15px] font-black">{item.name}</span>
									<span class="block text-[13px] font-bold text-muted">{item.time}</span>
								</span>
								<span
									class={[
										'flex-none font-heading text-[18px]',
										spent ? 'text-muted' : 'text-amber'
									]}>{spent ? minus(item.amount) : `+${item.amount}`}</span
								>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="mt-[60px] flex flex-col items-center gap-3 text-center">
			<span class="flex size-[84px] items-center justify-center rounded-full bg-card">
				<svg
					aria-hidden="true"
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					stroke="var(--color-muted)"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" /></svg
				>
			</span>
			<h2 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">No stars yet</h2>
			<p class="m-0 max-w-[280px] text-[16px] leading-[1.45] font-bold text-muted">
				Stars show up here when a grown-up accepts a chore.
			</p>
		</div>
	{/if}
{/if}
