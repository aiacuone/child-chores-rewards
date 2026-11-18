<script lang="ts">
	// A grown-up's photo for a chore or reward: take or pick it, move and zoom it,
	// or confirm removing it (Photo-Choose, Photo-Crop, Photo-Choose-Camera-Blocked,
	// Photo-Remove-Confirm and their reward versions).
	import { onDestroy, onMount } from 'svelte';
	import PhotoCropper from '#lib/components/PhotoCropper.svelte';
	import RewardPlanet from '#lib/components/RewardPlanet.svelte';
	import { PHOTO_FAILED, watchCamera } from '#lib/camera.ts';
	import type { PhotoDraft } from '#lib/photo-draft.svelte.ts';
	import type { PlanetId } from '#lib/reward-planets.ts';

	let {
		kind,
		draft,
		name,
		planet = 'pink'
	}: {
		kind: 'chore' | 'reward';
		draft: PhotoDraft;
		name: string;
		planet?: PlanetId;
	} = $props();

	const isReward = $derived(kind === 'reward');
	const label = $derived(name.trim() || `this ${kind}`);

	let picture = $state<ImageBitmap | null>(null);
	let cameraBlocked = $state(false);
	let showBlocked = $state(false);
	let message = $state('');
	let saving = $state(false);
	let cropper = $state<PhotoCropper>();
	let cameraInput = $state<HTMLInputElement>();
	let libraryInput = $state<HTMLInputElement>();

	onMount(() => watchCamera((blocked) => (cameraBlocked = blocked)));
	const forget = () => {
		picture?.close();
		picture = null;
	};
	onDestroy(forget);

	function takePhoto() {
		if (cameraBlocked) showBlocked = true;
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
		} catch {
			message = PHOTO_FAILED;
		}
	}

	async function useCrop() {
		if (saving) return;
		saving = true;
		const blob = await cropper?.cropped();
		saving = false;
		if (blob) await draft.chosen(blob);
		else {
			message = PHOTO_FAILED;
			forget();
		}
	}

	function back() {
		if (picture) forget();
		else if (showBlocked) showBlocked = false;
		else draft.screen = null;
	}

	const PRIMARY =
		'flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]';
	const SECOND =
		'flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] border-2 border-line bg-card font-heading text-[19px] text-ink';
	const DANGER =
		'flex min-h-14 w-full items-center justify-center rounded-[20px] border-2 border-[#7A3A4A] font-heading text-[19px] text-danger';
	const HEADING = 'm-0 font-heading text-[30px] leading-[1.05] font-normal';
	const TEXT = 'm-0 text-[16px] leading-[1.45] font-bold text-muted';
</script>

{#snippet icon(type: 'camera' | 'picture')}
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
		{#if type === 'camera'}
			<path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" />
		{:else}
			<rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" />
			<path d="m21 17-5-5-9 8" />
		{/if}
	</svg>
{/snippet}

<div class="mb-1.5 flex items-center gap-3">
	<button
		type="button"
		aria-label="Back"
		onclick={back}
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
	</button>
	<span class="flex-1 font-heading text-[18px] text-muted">Back</span>
</div>

{#if draft.screen === 'remove'}
	<div class="flex justify-center">
		{#if isReward}
			<RewardPlanet colour={planet} photo={draft.preview} size={110} />
		{:else if draft.preview}
			<img
				src={draft.preview}
				alt=""
				width="150"
				height="150"
				class="size-[150px] rounded-[32px] object-cover"
			/>
		{/if}
	</div>
	<h1 class="m-0 text-center font-heading text-[34px] leading-[1.05] font-normal">
		Remove this photo?
	</h1>
	<p class="{TEXT} text-center">
		{isReward ? 'The planet' : 'The built-in picture'} comes back for {label}. You can add a new
		photo any time.
	</p>
	<div class="mt-2.5 flex flex-col gap-2.5">
		<button type="button" class={DANGER} onclick={() => draft.removed()}>Yes, remove photo</button>
		<button type="button" class={SECOND} onclick={() => (draft.screen = null)}>Keep photo</button>
	</div>
{:else if picture}
	<h1 class={HEADING}>Move and zoom</h1>
	<p class={TEXT}>Drag the photo until it fits the frame.</p>
	<PhotoCropper bind:this={cropper} {picture} round={isReward} />
	<button type="button" class={PRIMARY} disabled={saving} onclick={useCrop}>
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
	<button type="button" class={SECOND} onclick={forget}>Try again</button>
{:else}
	<h1 class={HEADING}>Photo for this {kind}</h1>
	{#if showBlocked}
		<div class="flex items-start gap-3 rounded-[18px] border-2 border-amber bg-amber/10 p-3.5">
			<span class="flex size-11 flex-none items-center justify-center rounded-full bg-amber/20 text-amber">
				{@render icon('camera')}
			</span>
			<span class="flex flex-col gap-1">
				<span class="text-[17px] font-black">The camera is turned off for this app</span>
				<span class="text-[15px] leading-[1.4] font-bold text-muted"
					>Allow the camera for this site in your browser settings, then tap Try the camera again.</span
				>
			</span>
		</div>
		<p class={TEXT}>You can still pick a photo from this device.</p>
	{:else}
		<p class={TEXT}>
			{isReward
				? 'Add a photo of the reward, like the pool.'
				: 'Add a photo of the chore, like the plants to water.'} Children see it instead of a picture.
			Only your family can see it.
		</p>
	{/if}
	{#if message}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{message}</p>
	{/if}
	{#if showBlocked}
		<button type="button" class={PRIMARY} onclick={() => libraryInput?.click()}>
			{@render icon('picture')}Pick a photo
		</button>
		<button type="button" class={SECOND} onclick={() => cameraInput?.click()}>
			{@render icon('camera')}Try the camera again
		</button>
	{:else}
		<button type="button" class={PRIMARY} onclick={takePhoto}>
			{@render icon('camera')}Take a photo
		</button>
		<button type="button" class={SECOND} onclick={() => libraryInput?.click()}>
			{@render icon('picture')}Pick a photo
		</button>
	{/if}
	<button type="button" class={SECOND} onclick={() => (draft.screen = null)}
		>Use a picture instead</button
	>
{/if}

<input
	bind:this={cameraInput}
	hidden
	type="file"
	accept="image/*"
	capture="environment"
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
