<script lang="ts">
	// "Hi Mia! Tap your 3 secret pictures." (Passcode-Enter.dc.html). The server
	// checks the pictures and decides when the trip opens.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import BackArrow from '#lib/components/BackArrow.svelte';
	import PasscodePicture from '#lib/components/PasscodePicture.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import StarField from '#lib/components/StarField.svelte';
	import { PASSCODE_LENGTH, PICTURE_IDS, type PictureId } from '#lib/passcode.ts';

	let { data } = $props();
	const child = $derived(data.child);

	const WRONG = 'Those aren’t your pictures. Try again.';
	const PROBLEM = 'Something went wrong. Try again.';
	const secondsText = (n: number) => `Wait ${n} ${n === 1 ? 'second' : 'seconds'}, then try again.`;

	const startWait = () => data.waitSeconds;
	let tapped = $state<PictureId[]>([]);
	let message = $state('');
	let checking = $state(false);
	let wait = $state(startWait());
	let waitAnnounced = $state(startWait() > 0 ? secondsText(startWait()) : '');
	let timer: ReturnType<typeof setInterval> | undefined;

	function startWaiting(seconds: number) {
		clearInterval(timer);
		wait = seconds;
		waitAnnounced = secondsText(seconds);
		message = '';
		timer = setInterval(() => {
			wait -= 1;
			if (wait <= 0) {
				clearInterval(timer);
				waitAnnounced = '';
			}
		}, 1000);
	}
	onMount(() => {
		if (wait > 0) startWaiting(wait);
		return () => clearInterval(timer);
	});

	async function check(pictures: PictureId[]) {
		checking = true;
		try {
			const res = await fetch(`/api/passcode/${child.id}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ pictures })
			});
			if (!res.ok) throw new Error('refused');
			const answer = (await res.json()) as { result: string; seconds?: number };
			if (answer.result === 'ok') {
				await goto(data.next);
				return;
			}
			if (answer.result === 'wait') startWaiting(answer.seconds ?? 30);
			else message = WRONG;
		} catch {
			message = PROBLEM;
		}
		tapped = [];
		checking = false;
	}

	function tap(picture: PictureId) {
		if (checking || wait > 0) return;
		message = '';
		tapped = [...tapped, picture];
		if (tapped.length === PASSCODE_LENGTH) check(tapped);
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Hi {child.name}!</title>
</svelte:head>

<main class="relative min-h-screen overflow-hidden">
	<StarField />
	<div
		aria-hidden="true"
		class="absolute inset-x-0 top-0 z-[5] h-2"
		style="background:{child.colour}"
	></div>

	<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-[18px] px-[22px] pt-[26px] pb-10">
		<BackArrow href="/" />
		<div class="flex items-center gap-3.5">
			<Rocket colour={child.colour} rank={child.rank} photo={child.photo} height={70} />
			<h1 class="m-0 font-heading text-[38px] leading-[1.05] font-normal">Hi {child.name}!</h1>
		</div>
		<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">Tap your 3 secret pictures.</p>

		<div
			role="img"
			aria-label="{tapped.length} of {PASSCODE_LENGTH} pictures tapped"
			class="flex justify-center gap-4"
		>
			{#each { length: PASSCODE_LENGTH } as _, i (i)}
				<span
					class={['size-[22px] rounded-full border-[3px] border-hi', i < tapped.length && 'bg-hi']}
				></span>
			{/each}
		</div>

		<div role="alert" class="min-h-6 text-center text-[16px] font-black text-amber">
			{#if wait > 0}
				<!-- Read out once; the countdown itself would repeat every second. -->
				<span class="sr-only">{waitAnnounced}</span>
				<span aria-hidden="true">{secondsText(wait)}</span>
			{:else}
				{message}
			{/if}
		</div>

		<div class="grid grid-cols-3 gap-3">
			{#each PICTURE_IDS as picture (picture)}
				<button
					type="button"
					aria-label={picture}
					disabled={wait > 0 || checking}
					onclick={() => tap(picture)}
					class="flex min-h-[84px] items-center justify-center rounded-[22px] border-[3px] border-transparent bg-card disabled:opacity-50"
				>
					<PasscodePicture {picture} />
				</button>
			{/each}
		</div>
	</div>
</main>
