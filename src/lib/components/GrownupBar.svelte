<script lang="ts">
	// The grown-up mode bar with "locks in 1:52" and Lock (Home-Locking.dc.html),
	// and the "Locking soon" warning for the last 10 seconds. Any touch, key or
	// scroll restarts the time, except while the warning shows: then only "Keep
	// going" does.
	import { onMount } from 'svelte';
	import { AUTO_LOCK, LOCK_WARNING } from '#lib/grownup-times.ts';
	import { grownup, lock, touch } from '#lib/grownup.svelte.ts';

	let now = $state(Date.now());
	let keepGoing = $state<HTMLButtonElement>();

	const left = $derived(Math.min(AUTO_LOCK, Math.max(0, grownup.lastTouch + AUTO_LOCK - now)));
	const warning = $derived(left <= LOCK_WARNING);
	const seconds = $derived(Math.ceil(left / 1000));
	const clock = $derived(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);

	$effect(() => {
		if (warning) keepGoing?.focus();
	});

	onMount(() => {
		const tick = setInterval(() => {
			now = Date.now();
			if (grownup.token && grownup.lastTouch + AUTO_LOCK <= now) lock();
		}, 250);
		const activity = () => {
			if (grownup.lastTouch + AUTO_LOCK - Date.now() > LOCK_WARNING) touch();
		};
		const events = ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'] as const;
		for (const e of events) window.addEventListener(e, activity, { passive: true });
		return () => {
			clearInterval(tick);
			for (const e of events) window.removeEventListener(e, activity);
		};
	});
</script>

<div
	class="fixed inset-x-0 top-0 z-[6] flex h-[46px] items-center gap-2 border-b-2 border-hi pr-3 pl-[18px] text-[14px] font-black text-hi"
	style="background:linear-gradient(rgb(255 159 90 / .16),rgb(255 159 90 / .16)),var(--color-bg)"
>
	<svg
		aria-hidden="true"
		width="18"
		height="18"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.4"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="flex-none"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg
	>
	Grown-up mode
	<span class="text-[13px] font-extrabold text-muted">· locks in {clock}</span>
	<button
		type="button"
		onclick={() => lock()}
		class="ml-auto inline-flex h-[34px] min-w-11 items-center justify-center rounded-full bg-hi px-3.5 text-[14px] font-black text-ink-on-orange"
		>Lock</button
	>
</div>

{#if warning}
	<div class="fixed inset-0 z-[8] flex items-center justify-center bg-[rgba(5,8,24,.7)] p-6">
		<div
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="locking-soon"
			aria-describedby="locking-soon-why"
			class="flex w-full max-w-[380px] flex-col items-center gap-3.5 rounded-[26px] border-2 border-hi bg-card p-6 text-center"
		>
			<span class="font-heading text-[60px] leading-none text-hi">{seconds}</span>
			<h2 id="locking-soon" class="m-0 font-heading text-[28px] leading-[1.05] font-normal">
				Locking soon
			</h2>
			<p id="locking-soon-why" class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
				No one has touched the screen for 2 minutes. Grown-up mode will lock.
			</p>
			<div class="flex w-full flex-col gap-2.5">
				<button
					bind:this={keepGoing}
					type="button"
					onclick={() => touch(true)}
					class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
					>Keep going</button
				>
				<button
					type="button"
					onclick={() => lock()}
					class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px] text-ink"
					>Lock now</button
				>
			</div>
		</div>
	</div>
{/if}
