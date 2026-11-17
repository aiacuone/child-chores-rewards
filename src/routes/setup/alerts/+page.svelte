<script lang="ts">
	// Setup step 4: "Get alerts on this phone" (design/screens/Setup-Alerts.dc.html).
	import { enhance } from '$app/forms';
	import SetupHeader from '#lib/components/SetupHeader.svelte';

	let { data, form } = $props();
	let sending = $state(false);
</script>

<svelte:head>
	<title>Rocket Rewards: Get alerts on this phone</title>
</svelte:head>

<SetupHeader step={4} back="/setup/email" />

<h1 class="m-0 font-heading text-[32px] leading-[1.05] font-normal">Get alerts on this phone</h1>
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
	ntfy tells you when a chore needs checking. Install the free ntfy app, then subscribe to your
	topic.
</p>

<div class="flex flex-col gap-1.5">
	<label for="topic" class="text-[14px] font-black text-muted">Your topic</label>
	<input
		id="topic"
		type="text"
		readonly
		value={data.topic}
		class="min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink"
	/>
</div>

<form
	method="POST"
	action="?/test"
	use:enhance={() => {
		sending = true;
		return async ({ update }) => {
			await update();
			sending = false;
		};
	}}
>
	<button
		type="submit"
		disabled={sending}
		class="flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] border-2 border-line bg-card font-heading text-[19px] text-ink disabled:opacity-70"
	>
		<svg
			aria-hidden="true"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"
			><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 003.4 0" /></svg
		>
		Send a test alert
	</button>
</form>

{#if form?.message}
	<p role="alert" class="m-0 text-[16px] font-black text-amber">{form.message}</p>
{/if}

<form method="POST" action="?/finish" use:enhance class="mt-2.5 flex flex-col">
	<button
		type="submit"
		class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
	>
		Finish
	</button>
</form>
