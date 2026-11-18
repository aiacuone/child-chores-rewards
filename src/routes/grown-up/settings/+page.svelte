<script lang="ts">
	// Temporary fix: only the Recovery email row exists until #31 builds the rest
	// of Settings (R11-Settings.dc.html).
	import { onMount } from 'svelte';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	let email = $state<string | null | undefined>(undefined);

	onMount(async () => {
		const res = await grownupFetch('/api/grown-up/recovery');
		if (res.ok) email = ((await res.json()) as { email: string | null }).email;
	});
</script>

<svelte:head>
	<title>Rocket Rewards: Settings</title>
</svelte:head>

<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Settings</h1>

<a
	href="/grown-up/settings/recovery"
	class="flex min-h-[60px] items-center gap-3 rounded-[18px] bg-card py-1.5 pr-3.5 pl-2.5"
>
	<span class="flex size-10 flex-none items-center justify-center rounded-xl bg-label">
		<svg
			aria-hidden="true"
			width="26"
			height="26"
			viewBox="0 0 24 24"
			fill="none"
			stroke="var(--color-ok)"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"
			><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg
		>
	</span>
	<span class="min-w-0 flex-1">
		<span class="block text-[16px] font-black">Recovery email</span>
		{#if email !== undefined}
			<span class="mt-0.5 block text-[13px] font-bold break-all text-muted"
				>{email ? `${email} · Verified` : 'Not confirmed yet'}</span
			>
		{/if}
	</span>
	<svg
		aria-hidden="true"
		width="18"
		height="18"
		viewBox="0 0 24 24"
		fill="none"
		stroke="var(--color-muted)"
		stroke-width="2.4"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="flex-none -scale-x-100"><path d="M15 5l-7 7 7 7" /></svg
	>
</a>

<p class="m-0 text-[18px] text-muted">Coming soon.</p>
