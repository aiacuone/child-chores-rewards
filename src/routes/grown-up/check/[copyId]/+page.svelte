<script lang="ts">
	// Check a chore (Stop-Waiting.dc.html). A tap on the chore alert lands here
	// after the PIN. Once it is no longer waiting (answered here or by another
	// grown-up), the Chores tab shows instead. The design's "Mia says she did this
	// at 6:12 pm" is "Mia says it's done · 6:12 pm", because children have no
	// pronouns stored.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ChoreIcon from '#lib/components/ChoreIcon.svelte';
	import PhotoImage from '#lib/components/PhotoImage.svelte';
	import LiveUpdates from '#lib/components/LiveUpdates.svelte';
	import Planet from '#lib/components/Planet.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { timeOfDay } from '#lib/check.ts';
	import { answer, fetchCheck, type CheckView } from '#lib/check-client.ts';

	const copyId = $derived(page.params.copyId!);
	let check = $state<CheckView | null>(null);
	let missing = $state(false);
	let busy = $state(false);
	let failed = $state(false);

	async function load() {
		const found = await fetchCheck(copyId);
		if (!found) missing = true;
		else if (found.status !== 'waiting') await goto('/grown-up/chores', { replaceState: true });
		else check = found;
	}
	onMount(load);

	async function accept() {
		busy = true;
		failed = false;
		if (await answer(copyId, { action: 'accept' })) {
			await goto(`/grown-up/chores?checked=${copyId}`);
		} else {
			failed = true;
			busy = false;
			await load();
		}
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Check a chore</title>
</svelte:head>

<BackHeader href="/grown-up/chores" label="Chores" />

{#if missing}
	<p class="m-0 text-[18px] text-muted">Not found.</p>
{:else if check}
	{@const name = check.child.name}
	<LiveUpdates version={check.version} onchange={load} />

	<div class="flex items-center gap-4">
		<PhotoImage src={check.chore.photo} size={96} radius="24px">
			{#snippet fallback()}
				<span class="relative size-24 flex-none">
					<Planet size={96} body="#E0B67A" spots="#b79564" />
					<span class="absolute inset-0 flex items-center justify-center text-ink-on-orange">
						<ChoreIcon icon={check!.chore.icon} size={40} />
					</span>
				</span>
			{/snippet}
		</PhotoImage>
		<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">{check.chore.name}</h1>
	</div>

	<p
		class="m-0 flex min-h-[52px] items-center gap-2.5 rounded-[18px] border-2 border-amber bg-amber/16 px-4 text-[15px] font-black"
	>
		<svg
			aria-hidden="true"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="var(--color-amber)"
			stroke-width="2.4"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="flex-none"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg
		>
		{name} says it’s done · {timeOfDay(new Date(check.doneAt ?? Date.now()))}
	</p>

	<dl class="m-0 overflow-hidden rounded-[18px] bg-card">
		{#each [['Who', name], ['Repeats', check.chore.repeats], ['Stars', `+${check.chore.stars}`]] as [term, value], i (term)}
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

	{#if failed}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>
	{/if}

	<div class="mt-1.5 flex flex-col gap-2.5">
		<button
			type="button"
			disabled={busy}
			onclick={accept}
			class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-ok font-heading text-[19px] text-ink-on-teal shadow-[0_5px_0_#33756b] disabled:opacity-70"
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
				class="flex-none"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
			>Yes, it’s done! +{check.chore.stars} stars
		</button>
		<a
			href="/grown-up/check/{copyId}/send-back"
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
			>Not done yet</a
		>
		<a
			href="/grown-up/check/{copyId}/who"
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
			>That wasn’t {name}</a
		>
	</div>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		Not done yet sends it back to {name}’s trip. That wasn’t {name} moves it to the right child.
	</p>
{/if}
