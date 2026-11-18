<script lang="ts">
	// The bonus planet (Child-Bonus.dc.html), and "Trip complete!" once the
	// daily bonus is earned (Space-Child-AllDone.dc.html). Temporary fix: no
	// "See my rewards" until #26.
	import Planet from '#lib/components/Planet.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import StarCount from '#lib/components/StarCount.svelte';
	import { DAILY_BONUS } from '#lib/bonus.ts';

	let { data } = $props();
	const child = $derived(data.child);
	const trip = $derived(`/trip/${child.id}`);
	const total = $derived(data.states.length);
	const finished = $derived(data.states.filter((s) => s === 'done' || s === 'waiting').length);
	const stops = (n: number) => `${n} stop${n === 1 ? '' : 's'}`;
	const BAR = { done: 'bg-ok', waiting: 'bg-amber', next: 'bg-track', open: 'bg-track' } as const;
	// Twinkles around "Trip complete!", as drawn.
	const SPARKLES = [
		{ x: 40, y: 100, size: 20, colour: 'var(--color-ok)' },
		{ x: 29, y: 218, size: 16, colour: 'var(--color-amber)' },
		{ x: 186, y: 49, size: 12, colour: 'var(--color-ok)' },
		{ x: 328, y: 77, size: 14, colour: 'var(--color-amber)' },
		{ x: 357, y: 188, size: 13, colour: 'var(--color-ok)' },
		{ x: 342, y: 311, size: 22, colour: 'var(--color-amber)' },
		{ x: 67, y: 338, size: 13, colour: 'var(--color-ok)' }
	];
</script>

<svelte:head>
	<title>Rocket Rewards: {data.bonus ? 'Trip complete' : 'Bonus stars'}</title>
</svelte:head>

{#snippet back(href: string)}
	<a
		{href}
		aria-label="Back"
		class="relative z-[3] flex size-12 flex-none items-center justify-center rounded-full bg-card text-ink"
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
{/snippet}

{#if data.bonus}
	<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-4 px-[22px] pt-[26px] pb-10">
		{#each SPARKLES as s, i (i)}
			<svg
				aria-hidden="true"
				class="absolute"
				style="left:{s.x}px;top:{s.y}px"
				width={s.size}
				height={s.size}
				viewBox="0 0 24 24"
				fill={s.colour}
				><path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" /></svg
			>
		{/each}
		{@render back(trip)}
		<div class="relative mx-auto -mt-10 h-[280px] w-[200px]">
			<div class="absolute top-[100px] left-1/2 -translate-x-1/2">
				<Planet size={170} body="var(--color-bonus-planet)" spots="#c69437" ring="#ffd951" />
			</div>
			<div class="absolute top-[62px] left-[66px]">
				<Rocket colour={child.colour} rank={child.rank} height={110} rotate={10} />
			</div>
		</div>
		<h1 class="m-0 text-center font-heading text-[40px] leading-[1.05] font-normal">
			Trip complete!
		</h1>
		<div class="flex justify-center gap-2">
			<span class="rounded-full bg-amber/20 px-2.5 py-1 text-[13px] font-black text-amber"
				>+{data.bonus.stars} bonus stars</span
			>
			<span class="rounded-full bg-ok/20 px-2.5 py-1 text-[13px] font-black text-ok"
				>{total} of {stops(total)}</span
			>
		</div>
		<span
			class="mx-auto inline-flex min-h-11 items-center rounded-full bg-card px-4 text-[18px]"
		>
			<StarCount stars={child.stars} size={20} />
		</span>
		<a
			href="/"
			class="mt-2 flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
			>Back to Who’s flying</a
		>
	</div>
{:else}
	<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-4 px-[22px] pt-[26px] pb-10">
		{@render back(trip)}
		<div class="mx-auto -mt-6">
			<Planet size={170} body="var(--color-bonus-planet)" spots="#c69437" ring="#ffd951" />
		</div>
		<h1 class="m-0 mt-4 text-center font-heading text-[34px] leading-[1.05] font-normal">
			Finish the whole trip
		</h1>
		<p class="m-0 text-center text-[18px] leading-[1.4] font-extrabold">
			Do all {stops(total)} today and get <span class="text-amber">+{DAILY_BONUS} bonus stars</span>.
		</p>
		<span
			role="progressbar"
			aria-label="Stops done today"
			aria-valuemin={0}
			aria-valuemax={total}
			aria-valuenow={finished}
			aria-valuetext="{finished} of {stops(total)} done"
			class="mt-2 flex gap-1.5"
		>
			{#each data.states as state, i (i)}
				<span class="h-3 flex-1 rounded-full {BAR[state]}"></span>
			{/each}
		</span>
		<p class="m-0 text-center text-[15px] font-black text-muted">{finished} of {stops(total)} done</p>
		<a
			href={trip}
			class="mt-4 flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
			>Back to my trip</a
		>
	</div>
{/if}
