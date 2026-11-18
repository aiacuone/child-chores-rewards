<script lang="ts">
	// The Chores tab (Parent-Stops.dc.html, Parent-Stops-Added.dc.html), with
	// TO CHECK and the notices after a check (Parent-Stops-Done,
	// Parent-Stops-Undone, Parent-Stops-SentBack, Parent-Stops-Moved), and skipped
	// and hidden chores (Parent-Stops-Skipped, -SkippedLong, -Hidden).
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ChoreIcon from '#lib/components/ChoreIcon.svelte';
	import PhotoImage from '#lib/components/PhotoImage.svelte';
	import DoneNotice from '#lib/components/DoneNotice.svelte';
	import LiveUpdates from '#lib/components/LiveUpdates.svelte';
	import { whoDoesIt, type ChoreRow, type Kid } from '#lib/chores.ts';
	import { clock } from '#lib/check.ts';
	import { answer, fetchCheck, type CheckView } from '#lib/check-client.ts';
	import { repeatLabel } from '#lib/repeat.ts';
	import { grownupFetch, grownupToday } from '#lib/grownup.svelte.ts';
	import { skipNotice, skipPill } from '#lib/skip.ts';
	import type { toCheck } from '#lib/server/check.ts';

	const today = grownupToday();
	let kids = $state<Kid[]>([]);
	let chores = $state<ChoreRow[] | null>(null);
	let checks = $state<ReturnType<typeof toCheck>>([]);
	let version = $state<number | null>(null);

	const who = $derived(page.url.searchParams.get('who') ?? 'all');
	const addedId = $derived(Number(page.url.searchParams.get('added')) || null);
	const added = $derived(chores?.find((c) => c.id === addedId) ?? null);
	const forWho = (childIds: number[]) =>
		who === 'all'
			? true
			: who === 'nobody'
				? childIds.length === 0
				: childIds.includes(Number(who));
	const shown = $derived(
		(chores ?? []).filter((c) => (who === 'hidden' ? c.hidden : forWho(c.childIds)))
	);
	const byParam = (name: string) =>
		chores?.find((c) => String(c.id) === page.url.searchParams.get(name)) ?? null;
	const skipped = $derived(byParam('skipped'));
	const hid = $derived(byParam('hid'));
	const checksShown = $derived(checks.filter((c) => forWho([c.childId])));
	const chips = $derived([
		{ key: 'all', label: 'All' },
		...kids.map((k) => ({ key: String(k.id), label: k.name })),
		{ key: 'nobody', label: 'Nobody' },
		{ key: 'hidden', label: 'Hidden' }
	]);

	// The notice after a check: ?checked, ?undone, ?sent or ?moved=<copy>&to=<child>.
	const params = $derived(page.url.searchParams);
	const noticeKind = $derived(
		(['checked', 'undone', 'sent', 'moved'] as const).find((k) => params.has(k)) ?? null
	);
	let noticeCopy = $state<CheckView | null>(null);
	let undoLeft = $state(0);
	let undoing = $state(false);

	async function load() {
		const [all, waiting] = await Promise.all([
			grownupFetch('/api/grown-up/chores'),
			grownupFetch('/api/grown-up/checks')
		]);
		if (all.ok) {
			const body = (await all.json()) as { children: Kid[]; chores: ChoreRow[] };
			kids = body.children;
			chores = body.chores;
		}
		if (waiting.ok) {
			const body = (await waiting.json()) as { version: number; checks: typeof checks };
			checks = body.checks;
			version = body.version;
		}
	}
	onMount(load);

	$effect(() => {
		const kind = noticeKind;
		const copy = kind ? params.get(kind) : null;
		noticeCopy = null;
		if (!copy || !/^\d{1,9}$/.test(copy)) return;
		fetchCheck(copy).then((found) => {
			noticeCopy = found;
			undoLeft = kind === 'checked' && found ? found.undoLeft : 0;
		});
	});

	// "Undo 0:52" counts down, then goes.
	$effect(() => {
		if (undoLeft <= 0) return;
		const timer = setTimeout(() => (undoLeft -= 1), 1000);
		return () => clearTimeout(timer);
	});

	async function undo() {
		if (!noticeCopy) return;
		undoing = true;
		const ok = await answer(noticeCopy.copyId, { action: 'undo' });
		undoing = false;
		if (ok) await goto(`/grown-up/chores?undone=${noticeCopy.copyId}`, { replaceState: true });
		else undoLeft = 0;
	}

	const movedTo = $derived(kids.find((k) => String(k.id) === params.get('to'))?.name ?? null);
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

{#if version !== null}
	<LiveUpdates {version} onchange={load} />
{/if}

{#if added}
	<DoneNotice text="{added.name} added" />
{:else if skipped?.skip}
	<DoneNotice text={skipNotice(skipped.name, skipped.skip, today)} />
{:else if hid?.hidden}
	<DoneNotice text="{hid.name} is hidden from children" />
{:else if noticeKind === 'checked' && noticeCopy}
	<div
		role="status"
		class="flex min-h-14 items-center gap-2.5 rounded-[18px] border-2 border-ok bg-ok/16 py-1 pr-2 pl-4 text-[15px] font-black"
	>
		<svg
			aria-hidden="true"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="flex-none text-ok"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
		>
		<span class="flex-1"
			>Checked! {noticeCopy.child.name}’s rocket flew on (+{noticeCopy.chore.stars} stars)</span
		>
		{#if undoLeft > 0}
			<button
				type="button"
				disabled={undoing}
				onclick={undo}
				class="inline-flex min-h-11 items-center rounded-full bg-label px-3.5 text-ink"
				>Undo {clock(undoLeft)}</button
			>
		{/if}
	</div>
{:else if noticeKind === 'undone' && noticeCopy}
	<DoneNotice text="Undone. {noticeCopy.child.name}’s chore is waiting again" />
{:else if noticeKind === 'sent' && noticeCopy}
	<DoneNotice text="Sent back to {noticeCopy.child.name} with your message" />
{:else if noticeKind === 'moved' && movedTo}
	<DoneNotice text="Moved to {movedTo}’s trip. Stars go to {movedTo}" />
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

{#if checksShown.length}
	<h2 class="m-0 text-[13px] font-black tracking-[.06em] text-amber">TO CHECK</h2>
	<ul class="m-0 flex list-none flex-col gap-2 p-0">
		{#each checksShown as c (c.copyId)}
			<li>
				<a
					href="/grown-up/check/{c.copyId}"
					class="flex min-h-[68px] items-center gap-3 rounded-[18px] border-2 border-amber bg-amber/14 pr-3.5 pl-2.5"
				>
					<PhotoImage src={c.photo} size={46} radius="14px">
						{#snippet fallback()}
							<span
								class="flex size-[46px] flex-none items-center justify-center rounded-[14px] bg-amber/25 text-amber"
							>
								<ChoreIcon icon={c.icon} size={26} />
							</span>
						{/snippet}
					</PhotoImage>
					<span class="min-w-0 flex-1">
						<span class="block text-[16px] font-black">{c.name}</span>
						<span class="block text-[13px] font-bold text-amber"
							>{c.childName} says it’s done · tap to check</span
						>
					</span>
					<span
						class="inline-flex h-[26px] flex-none items-center rounded-full bg-amber/20 px-2.5 text-[13px] font-black text-amber"
						>Check</span
					>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<h2 class="m-0 text-[13px] font-black tracking-[.06em] text-muted">ALL CHORES</h2>

{#if chores}
	<ul class="m-0 flex list-none flex-col gap-2 p-0">
		{#each shown as chore (chore.id)}
			<li>
				<a
					href="/grown-up/chores/{chore.id}"
					class="flex min-h-14 items-center gap-2.5 rounded-2xl bg-card py-2 pr-3 pl-2"
				>
					<PhotoImage src={chore.photo} size={38} radius="12px">
						{#snippet fallback()}
							<span
								class="flex size-[38px] flex-none items-center justify-center rounded-xl bg-label text-hi"
							>
								<ChoreIcon icon={chore.icon} />
							</span>
						{/snippet}
					</PhotoImage>
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
					{#if chore.hidden}
						<span class="inline-flex h-[26px] flex-none items-center rounded-full px-2.5 text-[13px] font-black bg-muted/20 text-muted">Hidden</span>
					{:else if chore.skip}
						<span class="inline-flex h-[26px] flex-none items-center rounded-full px-2.5 text-[13px] font-black bg-amber/20 text-amber">{skipPill(chore.skip, today)}</span>
					{/if}
					<span class="font-heading text-[17px] text-amber"
						>+{chore.stars}<span class="sr-only"> stars</span></span
					>
				</a>
			</li>
		{/each}
	</ul>
{/if}
