<script lang="ts">
	// Auto-lock (Auto-Lock.dc.html). A choice saves as soon as it is tapped.
	import { onMount } from 'svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ChoiceList from '#lib/components/ChoiceList.svelte';
	import SwitchRow from '#lib/components/SwitchRow.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { fetchSettings, saveSettings } from '#lib/settings-client.ts';
	import { AUTO_LOCK_MINUTES, minutesLabel, type Settings } from '#lib/settings.ts';

	let value = $state<Settings['autoLockMinutes'] | null>(null);
	let failed = $state(false);

	onMount(async () => (value = (await fetchSettings())?.settings.autoLockMinutes ?? null));

	async function choose(minutes: Settings['autoLockMinutes']) {
		const before = value;
		value = minutes;
		failed = !(await saveSettings({ autoLockMinutes: minutes }));
		if (failed) value = before;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Auto-lock</title>
</svelte:head>

<BackHeader href="/grown-up/settings" label="Settings" />
<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Auto-lock</h1>
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
	After you enter your PIN, grown-up mode stays open, so you can check several chores with one PIN.
	It locks itself when no one has touched the screen for:
</p>
{#if failed}<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>{/if}
{#if value !== null}
	<ChoiceList
		legend="Lock after"
		options={AUTO_LOCK_MINUTES}
		{value}
		label={minutesLabel}
		onchange={choose}
	/>
{/if}
<SwitchRow
	label="Lock when the app closes"
	hint="Always on, so children can’t find it unlocked"
	checked
	locked
/>
