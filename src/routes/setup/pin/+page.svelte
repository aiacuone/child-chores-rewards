<script lang="ts">
	// Setup step 2: "Choose a grown-up PIN" (design/screens/Setup-PIN.dc.html).
	import { enhance } from '$app/forms';
	import SetupHeader from '#lib/components/SetupHeader.svelte';

	let { form } = $props();

	const field =
		'min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink placeholder:text-muted';
</script>

<svelte:head>
	<title>Rocket Rewards: Choose a grown-up PIN</title>
</svelte:head>

<SetupHeader step={2} back="/setup/children" />

<h1 class="m-0 font-heading text-[32px] leading-[1.05] font-normal">Choose a grown-up PIN</h1>
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
	Only grown-ups can check chores and change settings.
</p>

<form method="POST" use:enhance class="flex flex-col gap-4">
	<div class="flex flex-col gap-1.5">
		<label for="pin" class="text-[14px] font-black text-muted">PIN</label>
		<input
			id="pin"
			name="pin"
			type="password"
			inputmode="numeric"
			pattern="[0-9]*"
			maxlength="4"
			autocomplete="new-password"
			placeholder="4 digits"
			class={field}
		/>
	</div>
	<div class="flex flex-col gap-1.5">
		<label for="again" class="text-[14px] font-black text-muted">Type it again</label>
		<input
			id="again"
			name="again"
			type="password"
			inputmode="numeric"
			pattern="[0-9]*"
			maxlength="4"
			autocomplete="new-password"
			placeholder="4 digits"
			class={field}
		/>
	</div>

	{#if form?.message}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{form.message}</p>
	{/if}

	<button
		type="submit"
		class="mt-2.5 flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
	>
		Next
	</button>
</form>
