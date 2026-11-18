<script lang="ts">
	// One stop (Stop.dc.html). "I did it!" asks "Are you Mia?" first.
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ChoreIcon from '#lib/components/ChoreIcon.svelte';
	import PhotoImage from '#lib/components/PhotoImage.svelte';
	import Planet from '#lib/components/Planet.svelte';

	let { data } = $props();
	const stop = $derived(data.stop);
	const trip = $derived(`/trip/${data.child.id}`);
</script>

<svelte:head>
	<title>Rocket Rewards: {stop.name}</title>
</svelte:head>

<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-4 px-[22px] pt-[26px] pb-10">
	<BackHeader href={trip} label="Do it any time today" />

	<div class="mx-auto">
		<PhotoImage src={stop.photo} size={220} radius="40px">
			{#snippet fallback()}
				<div class="relative -my-6 size-[220px]">
					<Planet size={220} body="#E0B67A" spots="#b79564" />
					<span class="absolute inset-0 flex items-center justify-center text-ink-on-orange">
						<ChoreIcon icon={stop.icon} size={84} />
					</span>
				</div>
			{/snippet}
			{#snippet loading()}
				<div
					role="img"
					aria-busy="true"
					aria-label="The photo is still loading"
					class="flex size-[220px] flex-col items-center justify-center gap-3 rounded-[40px] border-2 border-dashed border-line bg-card text-muted"
				>
					<svg
						aria-hidden="true"
						width="44"
						height="44"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path
							d="m21 17-5-5-9 8"
						/></svg
					>
					<span class="text-[14px] font-extrabold">Getting the photo…</span>
				</div>
			{/snippet}
		</PhotoImage>
	</div>

	<h1 class="m-0 mt-2 text-center font-heading text-[34px] leading-[1.05] font-normal">
		{stop.name}
	</h1>
	<div class="flex justify-center gap-2">
		<span class="rounded-full bg-amber/20 px-2.5 py-1 text-[13px] font-black text-amber"
			>+{stop.stars} stars</span
		>
		<span class="rounded-full bg-ok/20 px-2.5 py-1 text-[13px] font-black text-ok">{stop.repeats}</span>
	</div>
	{#if stop.expectations}
		<p class="m-0 text-center text-[18px] leading-[1.4] font-extrabold">{stop.expectations}</p>
	{/if}

	<a
		href="{trip}/stop/{stop.choreId}/confirm"
		class="mt-6 flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
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
		>I did it!
	</a>
	<a
		href={trip}
		class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
		>Back to my trip</a
	>
</div>
