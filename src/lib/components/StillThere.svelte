<script lang="ts">
	// Sends a child's trip back to Who's flying when nobody touches the screen
	// (docs/SPEC.md, "Keeping children from mixing up trips"). For the last 10
	// seconds it shows "Still there, Mia?" (design/screens/Space-Child-Idle.dc.html).
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Rocket from '#lib/components/Rocket.svelte';
	import type { RankName } from '#lib/ranks.ts';

	let {
		name,
		colour,
		rank,
		after = 60_000
	}: {
		name: string;
		colour: string;
		rank: RankName;
		/** No-touch time before going back, warning included. 1 minute by default; Settings comes with #31. */
		after?: number;
	} = $props();

	const WARNING = 10;
	let left = $state<number | null>(null);
	let hereButton = $state<HTMLButtonElement>();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let tick: ReturnType<typeof setInterval> | undefined;

	function stop() {
		clearTimeout(timer);
		clearInterval(tick);
	}

	function restart() {
		stop();
		left = null;
		timer = setTimeout(warn, Math.max(0, after - WARNING * 1000));
	}

	function warn() {
		left = WARNING;
		tick = setInterval(() => {
			left = (left ?? 1) - 1;
			if (left <= 0) {
				stop();
				goto('/');
			}
		}, 1000);
		queueMicrotask(() => hereButton?.focus());
	}

	// Any touch, click, key or scroll counts, but not while the warning shows:
	// then only "I'm here!" keeps the trip.
	function activity() {
		if (left === null) restart();
	}

	onMount(() => {
		const events = ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'] as const;
		for (const e of events) window.addEventListener(e, activity, { passive: true });
		restart();
		return () => {
			stop();
			for (const e of events) window.removeEventListener(e, activity);
		};
	});
</script>

{#if left !== null}
	<div class="fixed inset-0 z-[8] flex items-center justify-center bg-[rgba(5,8,24,.72)] p-6">
		<div
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="still-there"
			aria-describedby="still-there-why"
			class="flex w-full max-w-[380px] flex-col items-center gap-3.5 rounded-[26px] border-[3px] bg-card p-6 text-center"
			style="border-color:{colour}"
		>
			<Rocket {colour} {rank} height={80} />
			<h2 id="still-there" class="m-0 font-heading text-[30px] leading-[1.05] font-normal">
				Still there, {name}?
			</h2>
			<span class="font-heading text-[56px] leading-none text-hi" aria-live="off">{left}</span>
			<p id="still-there-why" class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
				This trip goes back to Who’s flying so nobody uses it by mistake.
			</p>
			<div class="flex w-full flex-col gap-2.5">
				<button
					bind:this={hereButton}
					type="button"
					onclick={restart}
					class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
					>I’m here!</button
				>
				<a
					href="/"
					class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px] text-ink"
					>That’s not me</a
				>
			</div>
		</div>
	</div>
{/if}
