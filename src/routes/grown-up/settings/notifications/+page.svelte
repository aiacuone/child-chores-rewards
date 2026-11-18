<script lang="ts">
	// Notifications (Notifications.dc.html). The safety alerts cannot be turned off.
	import { onMount } from 'svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import SwitchRow from '#lib/components/SwitchRow.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { fetchSettings, saveSettings, type SettingsView } from '#lib/settings-client.ts';

	let view = $state<SettingsView | null>(null);
	let failed = $state(false);

	onMount(async () => (view = await fetchSettings()));

	async function set(key: 'alertChores' | 'alertRewards', on: boolean) {
		if (!view) return;
		const saved = await saveSettings({ [key]: on });
		failed = !saved;
		if (saved) view.settings = saved;
	}
	const SAFETY = ['PIN reset code sent', 'Recovery email changed', 'PIN pad locked after wrong tries'];
</script>

<svelte:head>
	<title>Rocket Rewards: Notifications</title>
</svelte:head>

<BackHeader href="/grown-up/settings" label="Settings" />
<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Notifications</h1>
{#if failed}<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>{/if}

{#if view}
	<a
		href="/grown-up/settings/notifications/ntfy"
		class="flex min-h-[60px] items-center gap-3 rounded-[18px] bg-card py-1.5 pr-3.5 pl-2.5"
	>
		<span class="flex size-10 flex-none items-center justify-center rounded-xl bg-label">
			<svg
				aria-hidden="true"
				width="26"
				height="26"
				viewBox="0 0 24 24"
				fill="none"
				stroke="var(--color-amber)"
				stroke-width="2.2"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 003.4 0" /></svg
			>
		</span>
		<span class="min-w-0 flex-1">
			<span class="block text-[16px] font-black">ntfy</span>
			<span class="mt-0.5 block text-[13px] font-bold break-all text-muted"
				>Connected · topic {view.topic}</span
			>
		</span>
		<span
			class="inline-flex h-[26px] flex-none items-center rounded-full bg-ok/20 px-2.5 text-[13px] font-black text-ok"
			>On</span
		>
	</a>
	<SwitchRow
		label="A chore is waiting"
		hint="When a child taps I did it!"
		checked={view.settings.alertChores}
		onchange={(on) => set('alertChores', on)}
	/>
	<SwitchRow
		label="Reward claimed"
		hint="When a child asks for a reward"
		checked={view.settings.alertRewards}
		onchange={(on) => set('alertRewards', on)}
	/>
	{#each SAFETY as label (label)}
		<SwitchRow {label} hint="Always on, for safety" checked locked />
	{/each}
{/if}
