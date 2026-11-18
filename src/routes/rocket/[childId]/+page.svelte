<script lang="ts">
	// Put your face in the window (My-Rocket, My-Rocket-Crop, My-Rocket-Done,
	// My-Rocket-Camera-Blocked). The camera is the device's own, opened through the
	// file picker.
	import { onDestroy, onMount } from 'svelte';
	import BackArrow from '#lib/components/BackArrow.svelte';
	import PhotoCropper from '#lib/components/PhotoCropper.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import StarField from '#lib/components/StarField.svelte';
	import { PHOTO_FAILED, watchCamera } from '#lib/camera.ts';

	let { data } = $props();
	const child = $derived(data.child);

	const firstPhoto = () => data.child.photo;
	let step = $state<'choose' | 'blocked' | 'crop' | 'done'>('choose');
	let photo = $state(firstPhoto());
	let message = $state('');
	let saving = $state(false);
	let picture = $state<ImageBitmap | null>(null);
	let cameraBlocked = $state(false);
	let cropper = $state<PhotoCropper>();
	let cameraInput = $state<HTMLInputElement>();
	let libraryInput = $state<HTMLInputElement>();

	onMount(() => watchCamera((blocked) => (cameraBlocked = blocked)));

	function forget() {
		picture?.close();
		picture = null;
	}
	onDestroy(forget);

	function takePhoto() {
		if (cameraBlocked) step = 'blocked';
		else cameraInput?.click();
	}

	async function chosen(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		message = '';
		try {
			const bitmap = await createImageBitmap(file);
			forget();
			picture = bitmap;
			step = 'crop';
		} catch {
			message = PHOTO_FAILED;
		}
	}

	async function save() {
		if (saving || !picture) return;
		saving = true;
		message = '';
		try {
			const blob = await cropper?.cropped();
			if (!blob) throw new Error('no image');
			const res = await fetch(`/api/rocket/${child.id}/photo`, {
				method: 'PUT',
				headers: { 'content-type': 'image/jpeg' },
				body: blob
			});
			if (!res.ok) throw new Error('refused');
			photo = ((await res.json()) as { photo: string }).photo;
			forget();
			step = 'done';
		} catch {
			message = PHOTO_FAILED;
			step = 'choose';
			forget();
		}
		saving = false;
	}

	function tryAgain() {
		forget();
		step = 'choose';
	}

	const PRIMARY =
		'flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]';
	const SECOND =
		'flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] border-2 border-line bg-card font-heading text-[19px] text-ink';
	const HEADING = 'm-0 text-center font-heading text-[32px] leading-[1.05] font-normal';
	const TEXT = 'm-0 text-center text-[16px] leading-[1.4] font-bold text-muted';
</script>

<svelte:head>
	<title>Rocket Rewards: My rocket</title>
</svelte:head>

{#snippet icon(kind: 'camera' | 'picture')}
	<svg
		aria-hidden="true"
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="flex-none"
	>
		{#if kind === 'camera'}
			<path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
		{:else}
			<rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" />
			<path d="m21 17-5-5-9 8" />
		{/if}
	</svg>
{/snippet}

<main class="relative min-h-screen overflow-hidden">
	<StarField />
	<div
		aria-hidden="true"
		class="absolute inset-x-0 top-0 z-[5] h-2"
		style="background:{child.colour}"
	></div>

	<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-4 px-6 pt-[26px] pb-10">
		<BackArrow href="/" />

		{#if step === 'choose'}
			<div class="relative mx-auto h-60 w-[131px]">
				<Rocket colour={child.colour} rank={child.rank} {photo} height={240} />
				{#if !photo}
					<span
						class="absolute top-[89px] left-[41px] flex size-12 items-center justify-center rounded-full border-[3px] border-dashed border-ok bg-[rgba(5,8,24,.6)]"
					>
						<svg
							aria-hidden="true"
							width="26"
							height="26"
							viewBox="0 0 24 24"
							fill="none"
							stroke="var(--color-ok)"
							stroke-width="3.2"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg
						>
					</span>
				{/if}
			</div>
			<h1 class={HEADING}>Put your face in the window!</h1>
			<p class={TEXT}>Take a photo of yourself. Only your family can see it.</p>
			{#if message}
				<p role="alert" class="m-0 text-center text-[16px] font-black text-amber">{message}</p>
			{/if}
			<div class="mt-2 flex flex-col gap-3">
				<button type="button" class={PRIMARY} onclick={takePhoto}>
					{@render icon('camera')}Take a photo
				</button>
				<button type="button" class={SECOND} onclick={() => libraryInput?.click()}>
					{@render icon('picture')}Pick a photo
				</button>
			</div>
		{:else if step === 'blocked'}
			<div class="relative mx-auto h-60 w-[131px]">
				<Rocket colour={child.colour} rank={child.rank} {photo} height={240} />
				<span
					class="absolute top-[89px] left-[41px] flex size-12 items-center justify-center rounded-full border-[3px] border-amber bg-[rgba(5,8,24,.8)] text-amber"
				>
					{@render icon('camera')}
				</span>
			</div>
			<h1 class={HEADING}>The camera is off</h1>
			<p class={TEXT}>The camera is turned off for this app. A grown-up can turn it on. You can pick a photo now.</p>
			<div class="mt-2 flex flex-col gap-3">
				<button type="button" class={PRIMARY} onclick={() => libraryInput?.click()}>
					{@render icon('picture')}Pick a photo
				</button>
				<a href="/" class={SECOND}>Back to Who’s flying</a>
			</div>
		{:else if step === 'crop'}
			{#if picture}
				<PhotoCropper bind:this={cropper} {picture} round colour={child.colour} />
			{/if}
			<h1 class="{HEADING} mt-1.5">Move and zoom</h1>
			<p class={TEXT}>Drag your photo until your face fits the window.</p>
			<div class="mt-2 flex flex-col gap-3">
				<button type="button" class={PRIMARY} disabled={saving} onclick={save}>
					<svg
						aria-hidden="true"
						width="22"
						height="22"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.4"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
					>Looks good!
				</button>
				<button type="button" class={SECOND} onclick={tryAgain}>Try again</button>
			</div>
		{:else}
			<div class="mx-auto">
				<Rocket colour={child.colour} rank={child.rank} {photo} height={240} />
			</div>
			<h1 class={HEADING}>Looking good, {child.name}!</h1>
			<p class={TEXT}>Your face is in the window now.</p>
			<a href="/" class="{PRIMARY} mt-2">Back to Who’s flying</a>
		{/if}

		<input
			bind:this={cameraInput}
			hidden
			type="file"
			accept="image/*"
			capture="user"
			aria-label="Take a photo"
			onchange={chosen}
		/>
		<input
			bind:this={libraryInput}
			hidden
			type="file"
			accept="image/*"
			aria-label="Pick a photo"
			onchange={chosen}
		/>
	</div>
</main>
