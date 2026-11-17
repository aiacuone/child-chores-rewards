<script lang="ts">
	// Setup step 3: "Recovery email" (design/screens/Setup-Email.dc.html). No back
	// arrow: the PIN step is locked once the PIN is set.
	import { enhance } from '$app/forms';
	import SetupHeader from '#lib/components/SetupHeader.svelte';

	let { form } = $props();
	let sending = $state(false);
</script>

<svelte:head>
	<title>Rocket Rewards: Recovery email</title>
</svelte:head>

<SetupHeader step={3} />

<h1 class="m-0 font-heading text-[32px] leading-[1.05] font-normal">Recovery email</h1>
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
	If you forget the PIN, we email a reset code here. Any email works.
</p>

<form
	method="POST"
	use:enhance={() => {
		sending = true;
		return async ({ update }) => {
			await update();
			sending = false;
		};
	}}
	class="flex flex-col gap-4"
>
	<div class="flex flex-col gap-1.5">
		<label for="email" class="text-[14px] font-black text-muted">Email</label>
		<input
			id="email"
			name="email"
			type="email"
			maxlength="254"
			autocomplete="email"
			placeholder="you@example.com"
			class="min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink placeholder:text-muted"
		/>
	</div>

	{#if form?.message}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{form.message}</p>
	{/if}

	<button
		type="submit"
		disabled={sending}
		class="mt-2.5 flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731] disabled:opacity-70"
	>
		Send confirm link
	</button>
</form>
