<script lang="ts">
	// The Chores tab (Parent-Stops.dc.html, Parent-Stops-Added.dc.html).
	// Temporary fixes: no "TO CHECK" section until #24, and no Hidden chip until #29.
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import ChoreIcon from '#lib/components/ChoreIcon.svelte';
	import DoneNotice from '#lib/components/DoneNotice.svelte';
	import { whoDoesIt, type ChoreRow, type Kid } from '#lib/chores.ts';
	import { choreDay, repeatLabel } from '#lib/repeat.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	const today = choreDay(new Date());
	let kids = $state<Kid[]>([]);
	let chores = $state<ChoreRow[] | null>(null);

	const who = $derived(page.url.searchParams.get('who') ?? 'all');
	const addedId = $derived(Number(page.url.searchParams.get('added')) || null);
	const added = $derived(chores?.find((c) => c.id === addedId) ?? null);
	const shown = $derived(
		(chores ?? []).filter((c) =>
			who === 'all'
				? true
				: who === 'nobody'
					? c.childIds.length === 0
					: c.childIds.includes(Number(who))
		)
	);
	const chips = $derived([
		{ key: 'all', label: 'All' },
		...kids.map((k) => ({ key: String(k.id), label: k.name })),
		{ key: 'nobody', label: 'Nobody' }
	]);

	onMount(async () => {
		const res = await grownupFetch('/api/grown-up/chores');
		if (!res.ok) return;
		const body = (await res.json()) as { children: Kid[]; chores: ChoreRow[] };
		kids = body.children;
		chores = body.chores;
	});
</script>

<svelte:head>
	<title>Rocket Rewards: Chores</title>
</svelte:head>

<div class="flex items-center justify-between">
	<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Chores</h1>
	<a
		href="/grown-up/chores/new"
		aria-label="Add chore"
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
{/if}

<nav aria-label="Show chores for" class="flex flex-wrap gap-1.5">
	{#each chips as chip (chip.key)}
		<a
			href={chip.key === 'all' ? '/grown-up/chores' : `/grown-up/chores?who=${chip.key}`}
			aria-current={who === chip.key ? 'true' : undefined}
			class={[
				'flex min-h-11 flex-auto items-center justify-center rounded-full px-1.5 text-[13px] font-black',
				who === chip.key ? 'bg-hi text-ink-on-orange' : 'border-2 border-line text-muted'
			]}>{chip.label}</a
		>
	{/each}
</nav>

<h2 class="m-0 text-[13px] font-black tracking-[.06em] text-muted">ALL CHORES</h2>

{#if chores}
	<ul class="m-0 flex list-none flex-col gap-2 p-0">
		{#each shown as chore (chore.id)}
			<li>
				<a
					href="/grown-up/chores/{chore.id}"
					class="flex min-h-14 items-center gap-2.5 rounded-2xl bg-card py-2 pr-3 pl-2"
				>
					<span
						class="flex size-[38px] flex-none items-center justify-center rounded-xl bg-label text-hi"
					>
						<ChoreIcon icon={chore.icon} />
					</span>
					<span class="min-w-0 flex-1">
						<span class="block text-[15px] font-black">{chore.name}</span>
						<span class="block text-[13px] font-bold text-muted"
							>{repeatLabel(chore.repeat, today)} · {whoDoesIt(chore.childIds, kids)}</span
						>
					</span>
					{#if chore.id === addedId}
						<span
							class="inline-flex h-[26px] flex-none items-center rounded-full bg-ok/20 px-2.5 text-[13px] font-black text-ok"
							>New</span
						>
					{/if}
					<span class="font-heading text-[17px] text-amber"
						>+{chore.stars}<span class="sr-only"> stars</span></span
					>
				</a>
			</li>
		{/each}
	</ul>
{/if}
