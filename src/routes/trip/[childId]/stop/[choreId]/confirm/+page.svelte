<script lang="ts">
	// "Are you Mia?" (Confirm-Who.dc.html, Confirm-Who-Table.dc.html).
	// "No, that's not me" goes back to Who's flying.
	import { enhance } from '$app/forms';
	import Rocket from '#lib/components/Rocket.svelte';

	let { data } = $props();
	const child = $derived(data.child);
	let sending = $state(false);
</script>

<svelte:head>
	<title>Rocket Rewards: Are you {child.name}?</title>
</svelte:head>

<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-[18px] px-6 pt-[110px] pb-10">
	<div class="flex justify-center">
		<Rocket colour={child.colour} rank={child.rank} photo={child.photo} height={170} />
	</div>
	<h1 class="m-0 text-center font-heading text-[44px] leading-[1.05] font-normal">
		Are you {child.name}?
	</h1>
	<p class="m-0 text-center text-[17px] leading-[1.4] font-bold text-muted">
		Only {child.name} taps for {child.name}’s chores.
	</p>

	<form
		method="POST"
		class="mt-10 flex flex-col gap-3"
		use:enhance={() => {
			sending = true;
			return async ({ update }) => {
				await update();
				sending = false;
			};
		}}
	>
		<button
			disabled={sending}
			class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731] disabled:opacity-70"
		>
			<svg
				aria-hidden="true"
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="flex-none"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
			>Yes, I’m {child.name}
		</button>
		<a
			href="/"
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
			>No, that’s not me</a
		>
	</form>
</div>
