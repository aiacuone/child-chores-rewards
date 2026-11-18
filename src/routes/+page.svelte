<script lang="ts">
	// Who's flying? (design/screens/Main.dc.html, R-Main-Tablet.dc.html)
	// Left out until later items: the camera badge on each rocket (#34), and the
	// progress bar and reward line on each tile (the spec has no rule for them yet).
	import { onMount } from 'svelte';
	import Planet from '#lib/components/Planet.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import StarCount from '#lib/components/StarCount.svelte';
	import LiveUpdates from '#lib/components/LiveUpdates.svelte';
	import StarField from '#lib/components/StarField.svelte';
	import { grownup } from '#lib/grownup.svelte.ts';

	let { data } = $props();

	// "Grown-up mode is locked" (Main-Locked.dc.html), shown once after locking.
	let lockedNote = $state(false);

	// The "Add to Home Screen" tip shows once per device, and never when the app
	// already runs from the home screen. Remembered in this browser only.
	const TIP_KEY = 'rocket-rewards:home-tip-seen';
	let showTip = $state(false);

	onMount(() => {
		// Back here, a trip with a passcode needs its pictures again. This runs on
		// arrival and not in `load`, which also runs when a link is only hovered.
		if (data.children.some((c) => c.passcode))
			fetch('/api/passcode/close', { method: 'POST' }).catch(() => {});

		lockedNote = grownup.justLocked;
		grownup.clearJustLocked();

		const standalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true;
		if (standalone) return;
		try {
			if (localStorage.getItem(TIP_KEY)) return;
			localStorage.setItem(TIP_KEY, '1');
		} catch {
			return;
		}
		showTip = true;
	});
</script>

<svelte:head>
	<title>Rocket Rewards: Who’s flying?</title>
</svelte:head>

<main class="relative min-h-screen overflow-hidden">
	<StarField />
	<div aria-hidden="true" class="absolute -top-5 -right-[30px]">
		<Planet size={150} body="#9C8CF0" spots="#7f72c4" ring="#bba8ff" />
	</div>

	<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-4 px-[22px] pt-[30px] pb-10">
		<div class="font-heading text-[17px] tracking-[.1em] text-ok">ROCKET REWARDS</div>
		<h1 class="m-0 font-heading text-[44px] leading-[1.05] font-normal">Who’s flying<br />today?</h1>

		{#each data.children as child (child.id)}
			<a
				href={child.passcode ? `/passcode/${child.id}` : `/trip/${child.id}`}
				class="flex items-center gap-1.5 rounded-[26px] border-[3px] bg-card py-4 pr-4 pl-3"
				style="border-color:{child.colour}"
			>
				<span class="block min-w-14 flex-none px-2">
					<Rocket colour={child.colour} rank={child.rank} height={84} />
				</span>
				<span class="block flex-1">
					<span class="block font-heading text-[30px] leading-none">{child.name}</span>
					<span class="mt-1 block text-[13px] font-extrabold text-muted"
						>{child.rank} · <StarCount stars={child.stars} /></span
					>
				</span>
			</a>
		{/each}

		<a
			href="/grown-up"
			class="flex min-h-14 items-center justify-center gap-2.5 rounded-[20px] border-2 border-dashed border-line text-[16px] font-black text-muted"
		>
			<svg
				aria-hidden="true"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"
				><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg
			>
			I’m a grown-up
		</a>

		{#if lockedNote}
			<p
				role="status"
				class="m-0 flex min-h-[52px] items-center gap-2.5 rounded-[18px] border-2 border-hi bg-hi/16 px-4 text-[15px] font-black"
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
					class="flex-none text-hi"
					><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg
				>
				Grown-up mode is locked
			</p>
		{/if}

		{#if showTip}
			<p
				class="m-0 flex items-center gap-2.5 rounded-2xl border-2 border-line bg-card px-3.5 py-3 text-[14px] leading-[1.3] font-extrabold text-muted"
			>
				Tip: use “Add to Home Screen” so Rocket Rewards opens full screen. Only shown once.
			</p>
		{/if}
	</div>
</main>

<LiveUpdates version={data.version} />
