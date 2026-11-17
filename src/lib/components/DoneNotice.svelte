<script lang="ts">
	// A teal "done" line with a tick, as in Parent-Stops-Added ("Water the plants added").
	let { text }: { text: string } = $props();
</script>

<p
	role="status"
	class="m-0 flex min-h-[52px] items-center gap-2.5 rounded-[18px] border-2 border-ok bg-ok/16 px-4 text-[15px] font-black"
>
	<svg
		aria-hidden="true"
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="3"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="flex-none text-ok"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
	>
	{text}
</p>
