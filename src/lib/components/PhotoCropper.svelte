<script lang="ts">
	// Move and zoom (My-Rocket-Crop, Photo-Crop, Reward-Photo-Crop). Only the part
	// inside the frame is kept, as a small square (ADR 0011).
	let {
		picture,
		round = false,
		colour = 'var(--color-hi)'
	}: { picture: ImageBitmap; round?: boolean; colour?: string } = $props();

	const VIEW = 500;
	const OUTPUT = 512;
	const MOVE_KEY = 20;
	const MAX_BYTES = 450 * 1024;

	let zoom = $state(1);
	let x = $state(0);
	let y = $state(0);
	let canvas = $state<HTMLCanvasElement>();
	let dragFrom: { x: number; y: number } | null = null;

	const scale = (z = zoom) => Math.max(VIEW / picture.width, VIEW / picture.height) * z;

	function place(nextX: number, nextY: number, s = scale()) {
		x = Math.min(0, Math.max(VIEW - picture.width * s, nextX));
		y = Math.min(0, Math.max(VIEW - picture.height * s, nextY));
	}

	$effect.pre(() => {
		const s = scale(1);
		zoom = 1;
		place((VIEW - picture.width * s) / 2, (VIEW - picture.height * s) / 2, s);
	});

	function setZoom(next: number) {
		const before = scale();
		const after = scale(next);
		const middleX = (VIEW / 2 - x) / before;
		const middleY = (VIEW / 2 - y) / before;
		zoom = next;
		place(VIEW / 2 - middleX * after, VIEW / 2 - middleY * after, after);
	}

	$effect(() => {
		const context = canvas?.getContext('2d');
		if (!context) return;
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
			.drawImage(picture, x * ratio, y * ratio, picture.width * s, picture.height * s);
		return new Promise<Blob | null>((done) => output.toBlob(done, 'image/jpeg', quality));
	}

	/** The cropped photo as a JPEG, or null when the browser could not make one. */
	export async function cropped() {
		const blob = await square(0.85);
		return blob && blob.size > MAX_BYTES ? square(0.6) : blob;
	}
</script>

<div
	class={['mx-auto size-[250px] overflow-hidden border-[5px]', round ? 'rounded-full' : 'rounded-[26px]']}
	style:border-color={colour}
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
<div class="flex items-center gap-3 text-muted">
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
		><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path
			d="m21 17-5-5-9 8"
		/></svg
	>
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
