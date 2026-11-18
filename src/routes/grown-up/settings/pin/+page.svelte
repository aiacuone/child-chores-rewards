<script lang="ts">
	// Change your PIN. Not in the designs: this form was agreed for #31, in the
	// style of Change email. The server checks the current PIN.
	import { goto } from '$app/navigation';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	const values = $state({ current: '', pin: '', again: '' });
	let busy = $state(false);
	let message = $state<string | null>(null);

	const FIELDS = [
		{ id: 'current', label: 'Current PIN', auto: 'current-password' },
		{ id: 'pin', label: 'New PIN', auto: 'new-password' },
		{ id: 'again', label: 'Type it again', auto: 'new-password' }
	] as const;

	async function save(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		message = null;
		const res = await grownupFetch('/api/grown-up/pin', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(values)
		});
		busy = false;
		if (res.ok) {
			await goto('/grown-up/settings?saved=pin');
			return;
		}
		values.current = '';
		const body = (await res.json().catch(() => null)) as { message?: string } | null;
		message = body?.message ?? SAVE_FAILED;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Change your PIN</title>
</svelte:head>

<BackHeader href="/grown-up/settings" label="Settings" />
<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Change your PIN</h1>

<form class="flex flex-col gap-3.5" onsubmit={save}>
	{#each FIELDS as f (f.id)}
		<div class="flex flex-col gap-1.5">
			<label for={f.id} class="text-[14px] font-black text-muted">{f.label}</label>
			<input
				id={f.id}
				type="password"
				bind:value={values[f.id]}
				required
				inputmode="numeric"
				maxlength="4"
				autocomplete={f.auto}
				placeholder="4 digits"
				class="min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink placeholder:text-muted"
			/>
		</div>
	{/each}
	{#if message}
		<p role="alert" class="m-0 text-[16px] font-black text-danger">{message}</p>
	{/if}
	<button type="submit" disabled={busy} class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]">Save PIN</button>
	<a href="/grown-up/settings" class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]">Cancel</a>
</form>
