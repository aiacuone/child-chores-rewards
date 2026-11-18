<script lang="ts">
	// Back to Who's flying (Auto-Return.dc.html). A choice saves as soon as it is
	// tapped, and open trips pick it up with their next live update.
	import { onMount } from 'svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ChoiceList from '#lib/components/ChoiceList.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { fetchSettings, saveSettings } from '#lib/settings-client.ts';
	import { AUTO_RETURN_SECONDS, returnLabel, type Settings } from '#lib/settings.ts';

	let value = $state<Settings['autoReturnSeconds'] | null>(null);
	let failed = $state(false);

	onMount(async () => (value = (await fetchSettings())?.settings.autoReturnSeconds ?? null));

	async function choose(seconds: Settings['autoReturnSeconds']) {
		const before = value;
		value = seconds;
		failed = !(await saveSettings({ autoReturnSeconds: seconds }));
		if (failed) value = before;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Back to Who’s flying</title>
</svelte:head>

<BackHeader href="/grown-up/settings" label="Settings" />
<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Back to Who’s flying</h1>
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">When no one has touched a child’s trip for:</p>
{#if failed}<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>{/if}
{#if value !== null}
	<ChoiceList
		legend="Go back after"
		options={AUTO_RETURN_SECONDS}
		{value}
		label={returnLabel}
		onchange={choose}
	/>
{/if}
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">The child sees a 10-second “Still there?” warning first.</p>
