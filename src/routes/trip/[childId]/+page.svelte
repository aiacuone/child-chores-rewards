<script lang="ts">
	// A child's trip. Until #22 builds the path of stops, it is the header from
	// Space-Child.dc.html with the body of Space-Child-Empty.dc.html ("Nothing to
	// do today!"), which is true while there are no chores. The star count links
	// to the child's rewards once #26 builds them.
	import Planet from '#lib/components/Planet.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import StarCount from '#lib/components/StarCount.svelte';
	import StarField from '#lib/components/StarField.svelte';
	import StillThere from '#lib/components/StillThere.svelte';

	let { data } = $props();
	const child = $derived(data.child);
</script>

<svelte:head>
	<title>Rocket Rewards: {child.name}’s space trip</title>
</svelte:head>

<main class="relative min-h-screen overflow-hidden">
	<StarField />
	<div aria-hidden="true" class="absolute inset-x-0 top-0 z-[5] h-2" style="background:{child.colour}"></div>

	<div class="relative z-[3] mx-auto flex max-w-[420px] items-center gap-3 px-5 pt-[26px]">
		<a
			href="/"
			aria-label="Switch player"
			class="flex size-12 flex-none items-center justify-center rounded-full bg-card text-ink"
		>
			<svg
				aria-hidden="true"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M15 5l-7 7 7 7" /></svg
			>
		</a>
		<span class="min-w-0 flex-1">
			<h1 class="m-0 font-heading text-[28px] leading-[1.05] font-normal">
				{child.name}’s space trip
			</h1>
			<a
				href="/"
				class="-my-3 inline-flex min-h-5 items-center py-3 text-[13px] font-black text-hi"
				>Not {child.name}? Switch</a
			>
		</span>
		<span class="inline-flex min-h-11 items-center rounded-full bg-card px-3.5 text-[16px]">
			<StarCount stars={child.stars} size={18} />
		</span>
	</div>

	<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-4 px-[22px] pb-10">
		<div class="mt-[30px] flex justify-center">
			<div class="relative h-[240px] w-[200px]">
				<div class="absolute top-[90px] left-0">
					<Planet size={200} body="#5BB58A" spots="#4a9471" />
				</div>
				<div class="absolute top-0 left-[68px]">
					<Rocket colour={child.colour} rank={child.rank} height={130} rotate={10} />
				</div>
			</div>
		</div>
		<h2 class="m-0 text-center font-heading text-[36px] leading-[1.05] font-normal">
			Nothing to do today!
		</h2>
		<p class="m-0 text-center text-[18px] leading-[1.4] font-extrabold">
			Enjoy your day. New stops arrive tomorrow morning.
		</p>
	</div>
</main>

<StillThere name={child.name} colour={child.colour} rank={child.rank} />
