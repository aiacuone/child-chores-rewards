<script lang="ts">
	// Send it back (Not-Done.dc.html): pick a kind message, or write one. The
	// child sees it on the trip and the stop opens again. The design's "on her
	// trip" is "on the trip", because children have no pronouns stored.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import MessageChoice from '#lib/components/MessageChoice.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { SEND_BACK_MESSAGES } from '#lib/check.ts';
	import { answer, fetchCheck, type CheckView } from '#lib/check-client.ts';

	const copyId = $derived(page.params.copyId!);
	const back = $derived(`/grown-up/check/${copyId}`);
	let check = $state<CheckView | null>(null);
	let missing = $state(false);
	let message = $state('');
	let busy = $state(false);
	let failed = $state(false);

	onMount(async () => {
		const found = await fetchCheck(copyId);
		if (!found) missing = true;
		else if (found.status !== 'waiting') await goto('/grown-up/chores', { replaceState: true });
		else check = found;
	});

	async function send(e: SubmitEvent) {
		e.preventDefault();
		if (!message) return;
		busy = true;
		failed = false;
		if (await answer(copyId, { action: 'sendBack', message })) {
			await goto(`/grown-up/chores?sent=${copyId}`);
		} else {
			failed = true;
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Send back</title>
</svelte:head>

<BackHeader href={back} label="Back" />

{#if missing}
	<p class="m-0 text-[18px] text-muted">Not found.</p>
{:else if check}
	<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Send it back</h1>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		{check.child.name} sees your message on the trip, and the stop opens again.
	</p>

	<form onsubmit={send} class="flex flex-col gap-3.5">
		<MessageChoice choices={SEND_BACK_MESSAGES} bind:message />

		{#if failed}
			<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>
		{/if}

		<button
			disabled={busy || !message}
			class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731] disabled:opacity-70"
			>Send back</button
		>
		<a
			href={back}
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
			>Cancel</a
		>
	</form>
{/if}
