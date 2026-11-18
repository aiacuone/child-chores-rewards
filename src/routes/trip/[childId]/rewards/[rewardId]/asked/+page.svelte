<script lang="ts">
	// Asked a grown-up! (Claim-Waiting.dc.html). The stars stay safe until a
	// grown-up hands the reward out.
	import BackArrow from '#lib/components/BackArrow.svelte';
	import Rocket from '#lib/components/Rocket.svelte';

	let { data } = $props();
	const child = $derived(data.child);
</script>

<svelte:head>
	<title>Rocket Rewards: Reward asked</title>
</svelte:head>

<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-4 px-[22px] pt-[26px] pb-10">
	<BackArrow href="/trip/{child.id}/rewards" />
	<div class="mt-6 flex justify-center">
		<Rocket colour={child.colour} rank={child.rank} height={170} />
	</div>
	<h1 class="m-0 mt-2 text-center font-heading text-[40px] leading-[1.05] font-normal">
		Asked a grown-up!
	</h1>
	<p class="m-0 text-center text-[18px] leading-[1.4] font-extrabold">
		{data.rewardName} is on its way. Your stars stay safe until a grown-up hands it out.
	</p>
	<a
		href="/trip/{child.id}"
		class="mt-3 flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
		>Back to my trip</a
	>
</div>
