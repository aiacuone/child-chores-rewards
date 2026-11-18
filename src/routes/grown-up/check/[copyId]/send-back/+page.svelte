<script lang="ts">
	// Send it back (Not-Done.dc.html): pick a kind message, or write one. The
	// child sees it on the trip and the stop opens again. The design's "on her
	// trip" is "on the trip", because children have no pronouns stored.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { MAX_MESSAGE, SEND_BACK_MESSAGES } from '#lib/check.ts';
	import { answer, fetchCheck, type CheckView } from '#lib/check-client.ts';

	const copyId = $derived(page.params.copyId!);
	const back = $derived(`/grown-up/check/${copyId}`);
	const OWN = 'own';
	let check = $state<CheckView | null>(null);
	let missing = $state(false);
	let picked = $state<string>(SEND_BACK_MESSAGES[0]);
	let own = $state('');
	let busy = $state(false);
	let failed = $state(false);

	const message = $derived(picked === OWN ? own.trim() : picked);

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
		<fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
			<legend class="sr-only">Message</legend>
			{#each [...SEND_BACK_MESSAGES, OWN] as choice (choice)}
				{@const on = picked === choice}
				<label
					class={[
						'flex min-h-[58px] cursor-pointer items-center gap-3 rounded-[18px] border-2 bg-card px-4 text-[16px] font-black',
						on ? 'border-hi' : 'border-card'
					]}
				>
					<input type="radio" name="message" value={choice} bind:group={picked} class="sr-only" />
					<span
						aria-hidden="true"
						class={[
							'flex size-6 flex-none items-center justify-center rounded-full border-[3px]',
							on ? 'border-hi' : 'border-line'
						]}
					>
						{#if on}<span class="size-2.5 rounded-full bg-hi"></span>{/if}
					</span>
					{choice === OWN ? 'Write my own message…' : choice}
				</label>
			{/each}
		</fieldset>

		{#if picked === OWN}
			<label class="flex flex-col gap-1.5">
				<span class="text-[15px] font-black text-muted">Your message</span>
				<input
					type="text"
					bind:value={own}
					maxlength={MAX_MESSAGE}
					required
					class="min-h-14 rounded-[18px] border-2 border-line bg-card px-4 text-[16px] font-bold text-ink"
				/>
			</label>
		{/if}

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
