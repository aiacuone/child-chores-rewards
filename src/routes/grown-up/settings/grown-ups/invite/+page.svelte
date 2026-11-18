<script lang="ts">
	// Invite a grown-up (Invite.dc.html).
	import { goto } from '$app/navigation';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	const BACK = '/grown-up/settings/grown-ups';
	let email = $state('');
	let message = $state('');
	let sending = $state(false);

	async function send(e: SubmitEvent) {
		e.preventDefault();
		if (sending) return;
		sending = true;
		message = '';
		const res = await grownupFetch('/api/grown-up/grown-ups', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email })
		});
		const body = (await res.json().catch(() => null)) as {
			email?: string;
			message?: string;
		} | null;
		sending = false;
		if (res.ok) await goto(BACK, { state: { invited: body?.email ?? email } });
		else message = body?.message ?? SAVE_FAILED;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Invite a grown-up</title>
</svelte:head>

<BackHeader href={BACK} label="Back" />
<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Invite a grown-up</h1>

<form onsubmit={send} novalidate class="flex flex-col gap-3.5">
	<div class="flex flex-col gap-1.5">
		<label for="invite-email" class="text-[14px] font-black text-muted">Their Google email</label>
		<input
			id="invite-email"
			type="email"
			placeholder="name@gmail.com"
			maxlength={254}
			autocomplete="off"
			autocapitalize="none"
			bind:value={email}
			class="min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink placeholder:text-muted"
		/>
	</div>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		We email them an invite. They sign in with Google and use the family’s grown-up PIN.
	</p>
	{#if message}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{message}</p>
	{/if}
	<button
		type="submit"
		disabled={sending}
		class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
		>Send invite</button
	>
	<a
		href={BACK}
		class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
		>Cancel</a
	>
</form>
