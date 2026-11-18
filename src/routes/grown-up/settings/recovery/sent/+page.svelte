<script lang="ts">
	// Check your inbox (Recovery-Sent.dc.html).
	import BackHeader from '#lib/components/BackHeader.svelte';
</script>

<svelte:head>
	<title>Rocket Rewards: Check your inbox</title>
</svelte:head>

<BackHeader href="/grown-up/settings/recovery" label="Recovery email" />
<div class="mt-[30px] flex justify-center">
	<span class="flex size-[110px] items-center justify-center rounded-full bg-hi/18">
		<svg
			aria-hidden="true"
			width="52"
			height="52"
			viewBox="0 0 24 24"
			fill="none"
			stroke="var(--color-hi)"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg
		>
	</span>
</div>
<h1 class="m-0 text-center font-heading text-[34px] leading-[1.05] font-normal">Check your inbox</h1>
<p class="m-0 text-center text-[17px] leading-[1.45] font-bold text-muted">
	Tap the link we sent to confirm. Until then, the old email stays in use.
</p>
<a href="/grown-up/settings/recovery" class="mt-10 flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]">Done</a>
