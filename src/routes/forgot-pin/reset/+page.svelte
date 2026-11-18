<script lang="ts">
	// Set a new PIN (PIN-Reset, PIN-Reset-Wrong) and the cancelled code
	// (PIN-Reset-Expired). One real input sits over the six boxes, so typing,
	// pasting and the phone's "code from email" suggestion all work.
	import { enhance } from '$app/forms';
	import BackArrow from '#lib/components/BackArrow.svelte';

	let { data, form } = $props();
	let code = $state('');
	let busy = $state(false);

	const wrong = $derived(!!form && 'wrongCode' in form);
	const message = $derived(form && 'message' in form ? form.message : null);
	const field =
		'min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink placeholder:text-muted';
	const label = 'text-[14px] font-black text-muted';
</script>

<svelte:head>
	<title>Rocket Rewards: Set a new PIN</title>
</svelte:head>

<div><BackArrow href="/forgot-pin" /></div>

{#if data.cancelled}
	<div class="mt-[30px] flex justify-center">
		<span class="flex size-[110px] items-center justify-center rounded-full bg-danger/16">
			<svg
				aria-hidden="true"
				width="52"
				height="52"
				viewBox="0 0 24 24"
				fill="none"
				stroke="var(--color-danger)"
				stroke-width="2.2"
				stroke-linecap="round"
				stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg
			>
		</span>
	</div>
	<h1 class="m-0 text-center font-heading text-[32px] leading-[1.05] font-normal">
		That code has been cancelled
	</h1>
	<p class="m-0 text-center text-[17px] leading-[1.45] font-bold text-muted">Send a new one.</p>
	<div class="mt-[30px] flex flex-col gap-2.5">
		<form method="POST" action="/forgot-pin" class="flex flex-col">
			<button type="submit" class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]">
				<svg
					aria-hidden="true"
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg
				>Send a new code
			</button>
		</form>
		<a href="/grown-up" class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]">Back to PIN</a>
	</div>
{:else}
	<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Set a new PIN</h1>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		Enter the code from your email, then choose a new 4-digit PIN.
	</p>
	<form
		method="POST"
		class="flex flex-col gap-4"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		<div class="flex flex-col gap-1.5">
			<label for="code" class={label}>Code from email</label>
			<div class="relative flex gap-1.5">
				{#each [0, 1, 2, 3, 4, 5] as i (i)}
					<span
						aria-hidden="true"
						class={[
							'flex min-h-[58px] flex-1 items-center justify-center rounded-[14px] border-2 bg-card font-heading text-[26px]',
							wrong ? 'border-danger' : code[i] ? 'border-hi' : 'border-line'
						]}>{code[i] ?? ''}</span
					>
				{/each}
				<input
					id="code"
					name="code"
					bind:value={code}
					oninput={() => (code = code.replace(/\D/g, '').slice(0, 6))}
					inputmode="numeric"
					autocomplete="one-time-code"
					maxlength="6"
					required
					class="absolute inset-0 w-full cursor-text opacity-0"
				/>
			</div>
		</div>
		{#if wrong}
			<div
				role="alert"
				class="flex min-h-12 items-center gap-2.5 rounded-2xl border-2 border-danger bg-danger/14 px-3 py-2 text-[16px] font-black text-danger"
			>
				<span
					aria-hidden="true"
					class="flex size-[26px] flex-none items-center justify-center rounded-full bg-danger font-black text-[#2A0A0A]"
					>!</span
				>
				That code isn’t right. Check your email and try again.
			</div>
		{/if}
		<div class="flex flex-col gap-1.5">
			<label for="pin" class={label}>New PIN</label>
			<input
				id="pin"
				name="pin"
				type="password"
				inputmode="numeric"
				maxlength="4"
				autocomplete="new-password"
				placeholder="4 digits"
				class={field}
			/>
		</div>
		<div class="flex flex-col gap-1.5">
			<label for="again" class={label}>Type it again</label>
			<input
				id="again"
				name="again"
				type="password"
				inputmode="numeric"
				maxlength="4"
				autocomplete="new-password"
				placeholder="4 digits"
				class={field}
			/>
		</div>
		{#if message}
			<p role="alert" class="m-0 text-[16px] font-black text-danger">{message}</p>
		{/if}
		<button type="submit" disabled={busy} class="mt-3 flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]">Save PIN</button>
	</form>
{/if}
