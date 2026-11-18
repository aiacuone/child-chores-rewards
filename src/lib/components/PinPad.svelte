<script lang="ts">
	// The grown-up PIN pad: Parent-PIN, Parent-PIN-Wrong and Parent-PIN-Locked
	// (design/screens). The server checks the PIN and keeps the lockout count.
	import { onMount } from 'svelte';
	import { padLockedUntil, unlockWithPin } from '#lib/grownup.svelte.ts';

	let digits = $state('');
	let status = $state<'ready' | 'busy' | 'wrong' | 'locked'>('ready');
	let lockedUntil = $state(0);
	let now = $state(Date.now());

	const left = $derived(Math.max(0, Math.ceil((lockedUntil - now) / 1000)));
	const clock = $derived(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);

	function showLocked(until: number) {
		lockedUntil = until;
		now = Date.now();
		status = 'locked';
	}

	onMount(() => {
		padLockedUntil().then((until) => {
			if (until) showLocked(until);
		});
		const tick = setInterval(() => {
			now = Date.now();
			if (status === 'locked' && now >= lockedUntil) status = 'ready';
		}, 250);
		return () => clearInterval(tick);
	});

	async function press(d: string) {
		if (status === 'busy' || status === 'locked' || digits.length >= 4) return;
		if (status === 'wrong') status = 'ready';
		digits += d;
		if (digits.length < 4) return;
		status = 'busy';
		const pin = digits;
		try {
			const answer = await unlockWithPin(pin);
			digits = '';
			if (answer.result === 'wrong') status = 'wrong';
			else if (answer.result === 'locked') showLocked(answer.until);
			else status = 'ready';
		} catch {
			digits = '';
			status = 'wrong';
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (/^[0-9]$/.test(e.key)) press(e.key);
		else if (e.key === 'Backspace' && status !== 'busy') digits = digits.slice(0, -1);
	}

	const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];
	const lockIcon = 'M8 11V8a4 4 0 018 0v3';
</script>

<svelte:window {onkeydown} />

<svelte:head>
	<title>Rocket Rewards: Grown-up PIN</title>
</svelte:head>

<div class="flex flex-col gap-[18px]">
	<div class="flex items-center gap-3">
		<a
			href="/"
			aria-label="Back"
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
	</div>

	<div class="flex flex-col items-center gap-2.5 text-center">
		<span
			class={[
				'flex size-16 items-center justify-center rounded-full',
				status === 'locked' ? 'bg-danger/18 text-danger' : 'bg-hi/18 text-hi'
			]}
		>
			<svg
				aria-hidden="true"
				width="30"
				height="30"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"
				><rect x="5" y="11" width="14" height="10" rx="2" /><path d={lockIcon} /></svg
			>
		</span>
		{#if status === 'locked'}
			<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Too many tries</h1>
		{:else}
			<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Grown-up PIN</h1>
			<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
				Only grown-ups can approve chores and change settings.
			</p>
		{/if}
	</div>

	{#if status === 'locked'}
		<div
			class="flex flex-col items-center gap-1.5 rounded-[22px] border-2 border-danger bg-danger/12 py-3.5 text-center"
		>
			<span class="text-[13px] font-black text-muted">Try again in</span>
			<span role="timer" class="font-heading text-[64px] leading-none text-danger">{clock}</span>
		</div>
	{:else}
		<div
			class="my-1.5 flex justify-center gap-[18px]"
			role="img"
			aria-label="{digits.length} of 4 digits entered"
		>
			{#each [0, 1, 2, 3] as i (i)}
				<span
					class={[
						'size-5 rounded-full border-[3px]',
						status === 'wrong'
							? 'border-danger'
							: i < digits.length
								? 'border-hi bg-hi'
								: 'border-hi'
					]}
				></span>
			{/each}
		</div>
		{#if status === 'wrong'}
			<div
				role="alert"
				class="flex min-h-12 items-center justify-center gap-2.5 rounded-2xl border-2 border-danger bg-danger/14 text-[17px] font-black text-danger"
			>
				<span
					aria-hidden="true"
					class="flex size-[26px] items-center justify-center rounded-full bg-danger font-black text-[#2A0A0A]"
					>!</span
				>
				Wrong PIN, try again.
			</div>
		{/if}
	{/if}

	<div class="grid grid-cols-3 gap-3">
		{#each keys as key, i (i)}
			{#if key}
				<button
					type="button"
					disabled={status === 'locked' || status === 'busy'}
					onclick={() => press(key)}
					class="flex min-h-[66px] items-center justify-center rounded-[20px] bg-card font-heading text-[28px] text-ink disabled:opacity-35"
					>{key}</button
				>
			{:else}
				<span></span>
			{/if}
		{/each}
	</div>

	<a href="/forgot-pin" class="flex min-h-12 items-center justify-center text-[16px] font-black text-hi"
		>Forgot PIN?</a
	>
</div>
