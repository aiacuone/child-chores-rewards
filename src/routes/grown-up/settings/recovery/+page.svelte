<script lang="ts">
	// Recovery email (Recovery.dc.html).
	import { onMount } from 'svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	let email = $state<string | null | undefined>(undefined);

	onMount(async () => {
		const res = await grownupFetch('/api/grown-up/recovery');
		if (res.ok) email = ((await res.json()) as { email: string | null }).email;
	});
</script>

<svelte:head>
	<title>Rocket Rewards: Recovery email</title>
</svelte:head>

<BackHeader href="/grown-up/settings" label="Settings" />
<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Recovery email</h1>

{#if email !== undefined}
	<div class="flex flex-col gap-2 rounded-[20px] bg-card p-[18px]">
		<span class="text-[14px] font-black text-muted">Codes are sent to</span>
		{#if email}
			<span class="font-heading text-[24px] break-all">{email}</span>
			<span>
				<span
					class="inline-flex h-[26px] items-center rounded-full bg-ok/20 px-2.5 text-[13px] font-black text-ok"
					>Verified</span
				>
			</span>
		{:else}
			<span class="font-heading text-[24px]">No email confirmed yet</span>
		{/if}
	</div>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		Only used to send PIN reset codes. It can be any email, not just your Google one.
	</p>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		Every grown-up gets an alert when a code is sent.
	</p>
	<a href="/grown-up/settings/recovery/edit" class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]">Change email</a>
{/if}
