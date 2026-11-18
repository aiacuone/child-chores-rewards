<script lang="ts">
	// Put your face in the window (My-Rocket, My-Rocket-Crop, My-Rocket-Done). The
	// photo is cropped here and only the small square is sent (ADR 0011). The camera
	// is the device's own, opened through the file picker.
	import { onDestroy } from 'svelte';
	import BackArrow from '#lib/components/BackArrow.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import StarField from '#lib/components/StarField.svelte';

	let { data } = $props();
	const child = $derived(data.child);

	const VIEW = 500;
	const OUTPUT = 512;
	const MOVE_KEY = 20;
	const MAX_BYTES = 450 * 1024;
	const FAILED = 'That photo didn’t work. Try another one.';

	const firstPhoto = () => data.child.photo;
	let step = $state<'choose' | 'crop' | 'done'>('choose');
	let photo = $state(firstPhoto());
	let message = $state('');
	let saving = $state(false);
	let picture = $state<ImageBitmap | null>(null);
	let zoom = $state(1);
	let x = $state(0);
	let y = $state(0);
	let canvas = $state<HTMLCanvasElement>();
	let cameraInput = $state<HTMLInputElement>();
	let libraryInput = $state<HTMLInputElement>();
	let dragFrom: { x: number; y: number } | null = null;

	const scale = (z = zoom) =>
		picture ? Math.max(VIEW / picture.width, VIEW / picture.height) * z : 1;

	function place(nextX: number, nextY: number, s = scale()) {
		if (!picture) return;
		x = Math.min(0, Math.max(VIEW - picture.width * s, nextX));
		y = Math.min(0, Math.max(VIEW - picture.height * s, nextY));
	}

	function setZoom(next: number) {
		const before = scale();
		const after = scale(next);
		const middleX = (VIEW / 2 - x) / before;
		const middleY = (VIEW / 2 - y) / before;
		zoom = next;
		place(VIEW / 2 - middleX * after, VIEW / 2 - middleY * after, after);
	}

	function forget() {
		picture?.close();
		picture = null;
	}
	onDestroy(forget);

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
			zoom = 1;
			const s = scale(1);
			place((VIEW - bitmap.width * s) / 2, (VIEW - bitmap.height * s) / 2, s);
			step = 'crop';
		} catch {
			message = FAILED;
		}
	}

	$effect(() => {
		const context = canvas?.getContext('2d');
		if (!context || !picture) return;
		const s = scale();
		context.clearRect(0, 0, VIEW, VIEW);
		context.drawImage(picture, x, y, picture.width * s, picture.height * s);
	});

	function drag(e: PointerEvent) {
		if (!dragFrom || !canvas) return;
		const ratio = VIEW / canvas.getBoundingClientRect().width;
		place(x + (e.clientX - dragFrom.x) * ratio, y + (e.clientY - dragFrom.y) * ratio);
		dragFrom = { x: e.clientX, y: e.clientY };
	}

	function arrowKey(e: KeyboardEvent) {
		const moves: Record<string, [number, number]> = {
			ArrowLeft: [MOVE_KEY, 0],
			ArrowRight: [-MOVE_KEY, 0],
			ArrowUp: [0, MOVE_KEY],
			ArrowDown: [0, -MOVE_KEY]
		};
		const move = moves[e.key];
		if (!move) return;
		e.preventDefault();
		place(x + move[0], y + move[1]);
	}

	function square(quality: number) {
		const output = document.createElement('canvas');
		output.width = output.height = OUTPUT;
		const ratio = OUTPUT / VIEW;
		const s = scale() * ratio;
		output
			.getContext('2d')!
			.drawImage(picture!, x * ratio, y * ratio, picture!.width * s, picture!.height * s);
		return new Promise<Blob | null>((done) => output.toBlob(done, 'image/jpeg', quality));
	}

	async function save() {
		if (saving || !picture) return;
		saving = true;
		message = '';
		try {
			let blob = await square(0.85);
			if (blob && blob.size > MAX_BYTES) blob = await square(0.6);
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
			message = FAILED;
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
				<button type="button" class={PRIMARY} onclick={() => cameraInput?.click()}>
					{@render icon('camera')}Take a photo
				</button>
				<button type="button" class={SECOND} onclick={() => libraryInput?.click()}>
					{@render icon('picture')}Pick a photo
				</button>
			</div>
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
		{:else if step === 'crop'}
			<div
				class="mx-auto size-[250px] overflow-hidden rounded-full border-[5px]"
				style="border-color:{child.colour}"
			>
				<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role, a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions: moved by dragging or with the arrow keys -->
				<canvas
					bind:this={canvas}
					width={VIEW}
					height={VIEW}
					role="img"
					tabindex="0"
					aria-label="Your photo. Drag it, or use the arrow keys, to move it."
					class="block size-full cursor-grab touch-none"
					onpointerdown={(e) => {
						dragFrom = { x: e.clientX, y: e.clientY };
						e.currentTarget.setPointerCapture(e.pointerId);
					}}
					onpointermove={drag}
					onpointerup={() => (dragFrom = null)}
					onpointercancel={() => (dragFrom = null)}
					onkeydown={arrowKey}
				></canvas>
			</div>
			<div class="mt-1.5 flex items-center gap-3 text-muted">
				<span class="flex-none">{@render icon('picture')}</span>
				<input
					type="range"
					aria-label="Zoom"
					min="1"
					max="3"
					step="0.01"
					value={zoom}
					oninput={(e) => setZoom(Number(e.currentTarget.value))}
					class="h-11 min-w-0 flex-1 accent-hi"
				/>
				<svg
					aria-hidden="true"
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="flex-none"
					><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path
						d="m21 17-5-5-9 8"
					/></svg
				>
			</div>
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
	</div>
</main>
