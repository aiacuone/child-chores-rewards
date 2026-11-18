<script lang="ts">
	// Not now (Claim-Decline.dc.html): pick a kind message, or write one. The
	// child sees it on My rewards, keeps their stars, and can ask again. The
	// design's "Her stars stay safe, and she can ask again" is "The stars stay
	// safe, and Mia can ask again", because children have no pronouns stored.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import MessageChoice from '#lib/components/MessageChoice.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { DECLINE_MESSAGES } from '#lib/claims.ts';
	import { answerClaim, fetchClaim, type ClaimView } from '#lib/claim-client.ts';

	const claimId = $derived(page.params.claimId!);
	const back = $derived(`/grown-up/claim/${claimId}`);
	let claim = $state<ClaimView | null>(null);
	let missing = $state(false);
	let message = $state('');
	let busy = $state(false);
	let failed = $state(false);

	onMount(async () => {
		const found = await fetchClaim(claimId);
		if (!found) missing = true;
		else if (found.status !== 'waiting') await goto('/grown-up/rewards', { replaceState: true });
		else claim = found;
	});

	async function send(e: SubmitEvent) {
		e.preventDefault();
		if (!message) return;
		busy = true;
		failed = false;
		const result = await answerClaim(claimId, { action: 'decline', message });
		if (result === 'ok' || result === 'gone') {
			await goto(`/grown-up/rewards?declined=${claimId}`);
		} else {
			failed = true;
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Decline a claim</title>
</svelte:head>

<BackHeader href={back} label="Back" />

{#if missing}
	<p class="m-0 text-[18px] text-muted">Not found.</p>
{:else if claim}
	<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Not now</h1>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		{claim.child.name} sees your message. The stars stay safe, and {claim.child.name} can ask again.
	</p>

	<form onsubmit={send} class="flex flex-col gap-3.5">
		<MessageChoice choices={DECLINE_MESSAGES} bind:message />

		{#if failed}
			<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>
		{/if}

		<button
			disabled={busy || !message}
			class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731] disabled:opacity-70"
			>Send message</button
		>
		<a
			href={back}
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
			>Cancel</a
		>
	</form>
{/if}
