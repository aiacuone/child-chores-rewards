<script lang="ts">
	// A child's trip (Space-Child.dc.html, Space-Child-Open.dc.html,
	// Space-Child-Waiting.dc.html, Space-Child-Reordered.dc.html,
	// Space-Child-Done.dc.html, Space-Child-Retry.dc.html), or "Nothing
	// to do today!" when no stops are
	// due (Space-Child-Empty.dc.html). The empty day keeps the name header, because
	// the spec keeps each child's name and "Not Mia? Switch" on their trip screens.
	// The bonus planet opens the bonus page. Once every stop is finished the
	// count reads "5 of 5 stops", as on Trip complete. The star count opens My
	// rewards, as does "See my rewards" on the empty day.
	import { enhance } from '$app/forms';
	import ChoreIcon from '#lib/components/ChoreIcon.svelte';
	import Planet from '#lib/components/Planet.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import SeeRewards from '#lib/components/SeeRewards.svelte';
	import StarCount from '#lib/components/StarCount.svelte';
	import { DAILY_BONUS } from '#lib/bonus.ts';
	import { asSaid } from '#lib/check.ts';
	import { pct, tripPath } from '#lib/trip-path.ts';
	import type { TripStop } from '#lib/server/trip.ts';

	let { data } = $props();
	const child = $derived(data.child);
	const stops = $derived(data.stops);
	const finished = $derived(stops.filter((s) => s.state === 'done' || s.state === 'waiting').length);
	const board = $derived(tripPath(stops.length, finished));
	// The message after "I did it!", with Undo, until the minute is up.
	let showSent = $state(false);
	$effect(() => {
		const sent = data.sent;
		showSent = sent !== null;
		if (!sent) return;
		const timer = setTimeout(() => (showSent = false), sent.secondsLeft * 1000);
		return () => clearTimeout(timer);
	});

	// "checked!" shows once: tell the server it has been seen, without reloading.
	$effect(() => {
		const notice = data.checked;
		if (!notice || (showSent && data.sent)) return;
		const body = new FormData();
		body.set('upTo', String(notice.id));
		fetch('?/seen', { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } }).catch(
			() => {}
		);
	});

	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

	const LOOK = {
		done: {
			ring: 'border-ok bg-ok/22 text-ok',
			note: 'text-ok',
			text: () => 'Done!'
		},
		waiting: {
			ring: 'border-amber bg-amber/20 text-amber',
			note: 'text-amber',
			text: () => 'Grown-up checking'
		},
		next: {
			ring: 'border-hi bg-hi text-ink-on-orange',
			note: 'text-hi',
			text: (s: TripStop) => `Up next · +${s.stars} stars`
		},
		open: {
			ring: 'border-line bg-card text-muted',
			note: 'text-muted',
			text: (s: TripStop) => `+${s.stars} stars`
		}
	} as const;
</script>

<svelte:head>
	<title>Rocket Rewards: {child.name}’s space trip</title>
</svelte:head>

{#snippet back()}
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
{/snippet}

	<div class="relative z-[3] mx-auto flex max-w-[420px] items-center gap-3 px-5 pt-[26px]">
		{@render back()}
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
		<a
			href="/trip/{child.id}/rewards"
			class="inline-flex min-h-11 items-center rounded-full bg-card px-3.5 text-[16px]"
		>
			<StarCount stars={child.stars} size={18} />
		</a>
	</div>

{#if stops.length === 0}
	<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col items-center gap-4 px-[22px] pb-10">
		<div class="relative mt-6 h-[260px] w-[200px]">
			<div class="absolute top-[100px] left-0"><Planet size={200} body="#5BB58A" spots="#4a9471" /></div>
			<div class="absolute top-0 left-[64px]">
				<Rocket colour={child.colour} rank={child.rank} height={130} rotate={10} />
			</div>
		</div>
		<h2 class="m-0 text-center font-heading text-[36px] leading-[1.05] font-normal">
			Nothing to do today!
		</h2>
		<p class="m-0 text-center text-[18px] leading-[1.4] font-extrabold">
			Enjoy your day. New stops arrive tomorrow morning.
		</p>
		<div class="mt-2 w-full">
			<SeeRewards href="/trip/{child.id}/rewards" />
		</div>
	</div>
{:else}
	<div
		class="relative z-[2] mx-auto mt-1.5 w-full max-w-[390px]"
		style="height:{board.height}px"
	>
		<p
			class="absolute top-2 right-[150px] left-5 z-[3] m-0 font-heading text-[17px] leading-[1.2] font-normal text-muted"
		>
			{#if finished === 0}
				{plural(stops.length, 'stop')} today · do them in any order!
			{:else if finished < stops.length}
				{finished} of {plural(stops.length, 'stop')} · {stops.length - finished} more for
				<span class="text-hi">+{DAILY_BONUS} bonus stars</span>
			{:else}
				{finished} of {plural(stops.length, 'stop')}
			{/if}
		</p>

		<svg
			aria-hidden="true"
			class="absolute inset-0 z-[1]"
			width="100%"
			height={board.height}
			viewBox="0 0 390 {board.height}"
			preserveAspectRatio="none"
		>
			<path
				d={board.path}
				fill="none"
				stroke="var(--color-track)"
				stroke-width="6"
				stroke-dasharray="2 12"
				stroke-linecap="round"
			/>
			<path
				d={board.trail}
				fill="none"
				stroke="var(--color-ok)"
				stroke-width="6"
				stroke-linecap="round"
				opacity=".8"
			/>
		</svg>

		<div
			class="absolute z-[1] -translate-x-1/2 -translate-y-1/2"
			style="left:{pct(board.home.x)};top:{board.home.y}px"
		>
			<Planet size={48} body="#5BB58A" spots="#4a9471" />
		</div>

		<a
			href="/trip/{child.id}/bonus"
			class="absolute top-0 z-[2] flex w-[120px] -translate-x-1/2 flex-col items-center"
			style="left:{pct(board.bonus.x)}"
		>
			<Planet size={96} body="var(--color-bonus-planet)" spots="#c69437" ring="#ffd951" />
			<span
				class="-mt-1.5 flex items-center gap-1 rounded-xl bg-bonus-planet px-2.5 py-1 text-[13px] font-black text-[#2a1c00]"
			>
				<svg
					aria-hidden="true"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="currentColor"
					stroke="currentColor"
					stroke-width="2.6"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="flex-none"
					><path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" /></svg
				>+{DAILY_BONUS} bonus
			</span>
		</a>

		<div
			class="absolute z-[3] -translate-x-1/2 -translate-y-1/2"
			style="left:{pct(board.rocket.x)};top:{board.rocket.y}px"
		>
			<Rocket colour={child.colour} rank={child.rank} height={70} rotate={board.rocket.rotate} />
		</div>

		<ol aria-label="Today’s stops" class="m-0 list-none p-0">
			{#each stops as stop, i (stop.choreId)}
				{@const at = board.stops[i]}
				{@const look = LOOK[stop.state]}
				{@const left = at.x < 195}
				{@const open = stop.state === 'next' || stop.state === 'open'}
				<li
					class="absolute z-[2] size-[66px] -translate-x-1/2 -translate-y-1/2"
					style="left:{pct(at.x)};top:{at.y}px"
				>
					<svelte:element
						this={open ? 'a' : 'div'}
						href={open ? `/trip/${child.id}/stop/${stop.choreId}` : undefined}
						class="absolute inset-0 block"
					>
						{#if stop.state === 'next'}
							<span
								aria-hidden="true"
								class="absolute -inset-[9px] rounded-full border-[3px] border-hi opacity-55"
							></span>
						{/if}
						<span
							class="absolute inset-0 flex items-center justify-center rounded-full border-4 {look.ring}"
						>
							<ChoreIcon icon={stop.icon} size={30} />
						</span>
						{#if stop.state === 'done' || stop.state === 'waiting'}
							<span
								aria-hidden="true"
								class={[
									'absolute -top-1.5 -right-1.5 flex size-[26px] items-center justify-center rounded-full shadow-[0_0_0_3px_var(--color-bg)]',
									stop.state === 'done' ? 'bg-ok text-[#0b1b10]' : 'bg-amber text-[#2a1c00]'
								]}
							>
								<svg
									aria-hidden="true"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width={stop.state === 'done' ? 3.4 : 2.6}
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									{#if stop.state === 'done'}
										<path d="M5 12.5l4.5 4.5L19 7.5" />
									{:else}
										<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
									{/if}
								</svg>
							</span>
						{/if}
						<span
							class={[
								'absolute top-1/2 w-[150px] -translate-y-1/2 rounded-[14px] bg-label px-[11px] py-[7px] text-left',
								left ? 'left-20' : 'right-20'
							]}
						>
							<span class="block text-[15px] leading-[1.15] font-black text-ink">{stop.name}</span>
							<span class="mt-0.5 block text-[13px] font-black {look.note}">{look.text(stop)}</span>
						</span>
					</svelte:element>
				</li>
			{/each}
		</ol>
	</div>

	{#if data.comingUp > 0}
		<div class="relative z-[4] mx-auto max-w-[420px] px-5 pb-8">
			<a
				href="/trip/{child.id}/coming-up"
				class="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line bg-card px-4 text-[15px] font-black"
			>
				<svg
					aria-hidden="true"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="var(--color-muted)"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="flex-none"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg
				>Coming up · {data.comingUp}
			</a>
		</div>
	{/if}
{/if}

{#if (showSent && data.sent) || data.checked || data.said}
	<div aria-hidden="true" class="h-24"></div>
{/if}

{#snippet toast(border: string)}
	<div
		role="status"
		class="fixed inset-x-0 bottom-6 z-[6] mx-auto flex min-h-[60px] max-w-[350px] items-center gap-3 rounded-[20px] border-2 bg-card px-4 text-[16px] font-black {border}"
		style="width:calc(100% - 40px)"
	>
		{#if data.checked}
			<svg
				aria-hidden="true"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="var(--color-amber)"
				stroke="var(--color-amber)"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="flex-none"
				><path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" /></svg
			>
			<span class="flex-1">{data.checked.name} checked! +{data.checked.stars} stars</span>
		{:else if data.said}
			<span class="flex-none text-hi"><ChoreIcon icon={data.said.icon} size={24} /></span>
			<span class="flex-1">Grown-up says: “{asSaid(data.said.message ?? '')}”</span>
		{/if}
	</div>
{/snippet}

{#if showSent && data.sent}
	<div
		role="status"
		class="fixed inset-x-0 bottom-6 z-[6] mx-auto flex min-h-[60px] max-w-[350px] items-center gap-3 rounded-[20px] border-2 border-amber bg-card px-4 text-[16px] font-black"
		style="width:calc(100% - 40px)"
	>
		<svg
			aria-hidden="true"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="var(--color-amber)"
			stroke-width="2.4"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="flex-none"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg
		>
		<span class="flex-1">
			{data.sent.moved ? `${data.sent.name} moved to the front!` : 'Sent! A grown-up will check it.'}
		</span>
		<form method="POST" action="?/undo" use:enhance>
			<input type="hidden" name="chore" value={data.sent.choreId} />
			<button class="inline-flex min-h-11 items-center rounded-full bg-label px-4 text-ink">Undo</button>
		</form>
	</div>
{:else if data.checked}
	{@render toast('border-ok')}
{:else if data.said}
	{@render toast('border-hi')}
{/if}
