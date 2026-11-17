<script lang="ts">
	// A star icon with a number, as on the tiles and the trip header. Screen
	// readers hear "128 stars".
	let { stars, size = 14 }: { stars: number; size?: number } = $props();
</script>

<span class="inline-flex items-center gap-1 align-middle font-black text-amber"
	><svg
		aria-hidden="true"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="currentColor"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="flex-none"
		><path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" /></svg
	>{stars}<span class="sr-only">{' stars'}</span></span
>
