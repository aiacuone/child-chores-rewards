<script lang="ts">
	// Change email (Recovery-Edit.dc.html). The server checks the address and the
	// PIN, and nothing changes until the link sent to the new address is confirmed.
	import { goto } from '$app/navigation';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	let email = $state('');
	let pin = $state('');
	let busy = $state(false);
	let message = $state<string | null>(null);

	const field =
		'min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink placeholder:text-muted';
	const label = 'text-[14px] font-black text-muted';

	async function send(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		message = null;
		const res = await grownupFetch('/api/grown-up/recovery', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email, pin })
		});
		busy = false;
		pin = '';
		if (res.ok) {
			await goto('/grown-up/settings/recovery/sent');
			return;
		}
		const body = (await res.json().catch(() => null)) as { message?: string } | null;
		message = body?.message ?? SAVE_FAILED;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Change email</title>
</svelte:head>

<BackHeader href="/grown-up/settings/recovery" label="Recovery email" />
<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Change email</h1>

<form class="flex flex-col gap-3.5" onsubmit={send}>
	<div class="flex flex-col gap-1.5">
		<label for="email" class={label}>New recovery email</label>
		<input
			id="email"
			type="email"
			bind:value={email}
			required
			maxlength="254"
			autocomplete="email"
			placeholder="you@example.com"
			class={field}
		/>
	</div>
	<div class="flex flex-col gap-1.5">
		<label for="pin" class={label}>Your grown-up PIN</label>
		<input
			id="pin"
			type="password"
			bind:value={pin}
			required
			inputmode="numeric"
			maxlength="4"
			autocomplete="off"
			placeholder="Enter your PIN to confirm"
			class={field}
		/>
	</div>
	{#if message}
		<p role="alert" class="m-0 text-[16px] font-black text-danger">{message}</p>
	{/if}
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		We’ll send a link to confirm it. The old email works until you do. Grown-ups get an alert that
		it changed.
	</p>
	<button type="submit" disabled={busy} class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]">Send link</button>
	<a href="/grown-up/settings/recovery" class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]">Cancel</a>
</form>
