<script lang="ts">
	// "See my rewards" (Space-Child-AllDone.dc.html, Space-Child-Empty.dc.html):
	// the orange button to a child's My rewards.
	let { href }: { href: string } = $props();
</script>

<a
	{href}
	class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
>
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
		><rect x="3" y="9" width="18" height="12" rx="2" /><path d="M3 13h18M12 9v12" /><path
			d="M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"
		/></svg
	>See my rewards
</a>
