<script lang="ts">
	// Not in the designs: the page a recovery email's confirm link opens. Wording
	// agreed for #17.
	import { enhance } from '$app/forms';
	import StarField from '#lib/components/StarField.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Rocket Rewards: Confirm recovery email</title>
</svelte:head>

<main class="relative min-h-screen overflow-hidden">
	<StarField />
	<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-4 px-[22px] pt-[100px]">
		<h1 class="m-0 font-heading text-[32px] leading-[1.05] font-normal">Confirm recovery email</h1>
		{#if form?.confirmed}
			<p role="status" class="m-0 text-[17px] leading-[1.45] font-extrabold text-ok">
				Recovery email confirmed. You can close this page.
			</p>
		{:else if form || !data.email}
			<p role="alert" class="m-0 text-[17px] leading-[1.45] font-extrabold text-amber">
				This link has expired or was already used.
			</p>
		{:else}
			<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
				Use {data.email} for PIN reset codes?
			</p>
			<form method="POST" use:enhance class="mt-2.5 flex flex-col">
				<button
					type="submit"
					class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
				>
					Confirm
				</button>
			</form>
		{/if}
	</div>
</main>
