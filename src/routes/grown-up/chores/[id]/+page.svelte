<script lang="ts">
	// One chore (Stop-Parent.dc.html, Stop-Parent-Saved.dc.html).
	// Temporary fixes: no "Today" row until #22, no Skip and Hide until #29, and
	// "Saved" without the repeat days until #21.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ChoreIcon from '#lib/components/ChoreIcon.svelte';
	import ConfirmCard from '#lib/components/ConfirmCard.svelte';
	import DoneNotice from '#lib/components/DoneNotice.svelte';
	import Planet from '#lib/components/Planet.svelte';
	import { SAVE_FAILED, whoDoesIt, type ChoreRow, type Kid } from '#lib/chores.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	const id = $derived(page.params.id);
	let kids = $state<Kid[]>([]);
	let chore = $state<ChoreRow | null>(null);
	let missing = $state(false);
	let confirming = $state(false);
	let failed = $state(false);

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

	async function remove() {
		confirming = false;
		const res = await grownupFetch(`/api/grown-up/chores/${id}`, { method: 'DELETE' });
		if (res.ok) await goto('/grown-up/chores');
		else failed = true;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: {chore?.name ?? 'Chore'}</title>
</svelte:head>

<BackHeader href="/grown-up/chores" label="Chores" />

{#if missing}
	<p class="m-0 text-[18px] text-muted">Not found.</p>
{:else if chore}
	{#if page.url.searchParams.has('saved')}
		<DoneNotice text="Saved" />
	{/if}

	<div class="flex items-center gap-4">
		<span class="relative size-24 flex-none">
			<Planet size={96} body="#E0B67A" spots="#b79564" />
			<span class="absolute inset-0 flex items-center justify-center text-ink-on-orange">
				<ChoreIcon icon={chore.icon} size={40} />
			</span>
		</span>
		<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">{chore.name}</h1>
	</div>

	<dl class="m-0 overflow-hidden rounded-[18px] bg-card">
		{#each [['Who', whoDoesIt(chore.childIds, kids)], ['Repeats', 'Every day'], ['Stars', `+${chore.stars}`]] as [term, value], i (term)}
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

	<a
		href="/grown-up/chores/{chore.id}/edit"
		class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
		>Edit chore</a
	>

	{#if failed}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>
	{/if}

	<button
		type="button"
		onclick={() => (confirming = true)}
		class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-[#7A3A4A] font-heading text-[19px] text-danger"
		>Remove chore</button
	>

	{#if confirming}
		<ConfirmCard
			title="Remove {chore.name}?"
			text="It goes from every child’s trip. Stars already earned stay."
			confirmLabel="Remove chore"
			cancelLabel="Keep it"
			onconfirm={remove}
			oncancel={() => (confirming = false)}
		/>
	{/if}
{/if}
