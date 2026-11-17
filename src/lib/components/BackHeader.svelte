<script lang="ts">
	// A back arrow with the section name beside it, as on Stop-Parent and Add-Stop.
	let { href, label }: { href: string; label: string } = $props();
</script>

<div class="mb-1.5 flex items-center gap-3">
	<a
		{href}
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
	<span class="flex-1 font-heading text-[18px] text-muted">{label}</span>
</div>
