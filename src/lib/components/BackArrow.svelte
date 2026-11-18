<script lang="ts">
	// A round back arrow with no text, as on the child's screens (Child-Rewards,
	// Child-Bonus, Space-Child-AllDone).
	let { href }: { href: string } = $props();
</script>

<a
	{href}
	aria-label="Back"
	class="relative z-[3] flex size-12 flex-none items-center justify-center rounded-full bg-card text-ink"
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
