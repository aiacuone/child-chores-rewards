<script lang="ts">
	// Skip for how long? (Skip-Options.dc.html). "Pick a date…" opens a date field
	// here: the design has no screen for it.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { SAVE_FAILED, type ChoreRow, type Kid } from '#lib/chores.ts';
	import { grownup, grownupFetch, grownupToday } from '#lib/grownup.svelte.ts';
	import { timeLabel } from '#lib/settings.ts';
	import { addDays } from '#lib/repeat.ts';
	import { backOn, SKIP_DATE, SKIP_DAYS } from '#lib/skip.ts';

	const id = $derived(page.params.id);
	const today = grownupToday();
	let chore = $state<ChoreRow | null>(null);
	let kids = $state<Kid[]>([]);
	let missing = $state(false);
	let failed = $state(false);
	let busy = $state(false);
	let picking = $state(false);
	let date = $state('');

	onMount(async () => {
		const [one, all] = await Promise.all([
			grownupFetch(`/api/grown-up/chores/${id}`),
			grownupFetch('/api/grown-up/chores')
		]);
		if (!one.ok) {
			missing = true;
			return;
		}
		chore = (await one.json()) as ChoreRow;
		if (all.ok) kids = ((await all.json()) as { children: Kid[] }).children;
	});

	const whose = $derived.by(() => {
		const names = kids.filter((k) => chore?.childIds.includes(k.id)).map((k) => `${k.name}’s`);
		if (!names.length) return 'any';
		return new Intl.ListFormat('en-AU', { type: 'disjunction' }).format(names);
	});
	const backDay = (days: number) => backOn(addDays(today, days), today);
	const OPTION =
		'flex min-h-16 flex-col justify-center gap-0.5 rounded-[18px] bg-card px-4 text-left';

	async function skip(body: object) {
		busy = true;
		failed = false;
		const res = await grownupFetch(`/api/grown-up/chores/${id}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		busy = false;
		if (res.ok) await goto(`/grown-up/chores?skipped=${id}`);
		else failed = true;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Skip for how long?</title>
</svelte:head>

{#if missing}
	<BackHeader href="/grown-up/chores" label="Chores" />
	<p class="m-0 text-[18px] text-muted">Not found.</p>
{:else if chore}
	<BackHeader href="/grown-up/chores/{chore.id}" label={chore.name} />
	<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Skip for how long?</h1>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		{chore.name} won’t appear on {whose} trip for the days you pick.
	</p>

	{#if failed}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>
	{/if}

	<button
		type="button"
		disabled={busy}
		class={OPTION}
		onclick={() => skip({ action: 'skip', length: 'today' })}
	>
		<span class="text-[16px] font-black">Today only</span>
		<span class="text-[13px] font-bold text-muted">Back tomorrow at {timeLabel(grownup.resetMinutes)}</span>
	</button>
	{#each ['2', '3'] as const as length (length)}
		<button
			type="button"
			disabled={busy}
			class={OPTION}
			onclick={() => skip({ action: 'skip', length })}
		>
			<span class="text-[16px] font-black">{length} days</span>
			<span class="text-[13px] font-bold text-muted">Back on {backDay(SKIP_DAYS[length])}</span>
		</button>
	{/each}
	<button
		type="button"
		aria-expanded={picking}
		class={OPTION}
		onclick={() => (picking = !picking)}
	>
		<span class="text-[16px] font-black">Pick a date…</span>
		<span class="text-[13px] font-bold text-muted">Choose when it comes back</span>
	</button>
	{#if picking}
		<form
			class="flex flex-col gap-2.5 rounded-[18px] bg-card p-4"
			onsubmit={(e) => {
				e.preventDefault();
				skip({ action: 'skipUntil', date });
			}}
		>
			<label class="flex flex-col gap-1.5 text-[13px] font-extrabold text-muted">
				Comes back on
				<input
					type="date"
					required
					bind:value={date}
					min={addDays(today, SKIP_DATE.minDays)}
					max={addDays(today, SKIP_DATE.maxDays)}
					class="min-h-12 rounded-xl border-2 border-line bg-label px-3 text-[16px] font-black text-ink [color-scheme:dark]"
				/>
			</label>
			<button
				type="submit"
				disabled={busy || !date}
				class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange disabled:opacity-50"
				>Skip until this date</button
			>
		</form>
	{/if}
	<button
		type="button"
		disabled={busy}
		class={OPTION}
		onclick={() => skip({ action: 'skip', length: 'open' })}
	>
		<span class="text-[16px] font-black">Until I turn it back on</span>
		<span class="text-[13px] font-bold text-muted">Kept in the list, not on any trip</span>
	</button>
{/if}
