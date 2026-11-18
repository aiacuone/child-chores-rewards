<script lang="ts">
	// Forgot your PIN? (PIN-Forgot.dc.html). With no confirmed recovery email
	// there is nowhere to send a code; that message is not in the designs.
	import { enhance } from '$app/forms';
	import BackArrow from '#lib/components/BackArrow.svelte';

	let { data, form } = $props();
	let busy = $state(false);
</script>

<svelte:head>
	<title>Rocket Rewards: Forgot your PIN?</title>
</svelte:head>

<div><BackArrow href="/grown-up" /></div>
<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Forgot your PIN?</h1>

{#if data.email}
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		We’ll email a 6-digit code to your recovery email. Use it to set a new PIN.
	</p>
	<div class="flex min-h-[60px] items-center gap-3 rounded-[18px] bg-card px-4 text-[18px] font-black">
		<svg
			aria-hidden="true"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="var(--color-hi)"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="flex-none"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg
		>
		<span class="min-w-0 break-all">{data.email}</span>
	</div>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		Every grown-up gets an ntfy alert when a code is sent.
	</p>
	{#if form?.message}
		<p role="alert" class="m-0 text-[16px] font-black text-danger">{form.message}</p>
	{/if}
	<form
		method="POST"
		class="mt-10 flex flex-col"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update();
				busy = false;
			};
		}}
	>
		<button type="submit" disabled={busy} class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]">Send code</button>
	</form>
{:else}
	<p role="alert" class="m-0 text-[16px] leading-[1.45] font-bold text-amber">
		No recovery email is confirmed yet. Open the confirm link we emailed you first.
	</p>
{/if}
