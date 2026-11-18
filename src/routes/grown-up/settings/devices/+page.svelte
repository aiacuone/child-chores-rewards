<script lang="ts">
	// Sign-in and devices (Devices.dc.html).
	import { onMount } from 'svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import DoneNotice from '#lib/components/DoneNotice.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';
	import { fetchSettings } from '#lib/settings-client.ts';

	let email = $state<string | null>(null);
	let done = $state(false);
	let failed = $state(false);

	onMount(async () => (email = (await fetchSettings())?.signedInAs ?? null));

	const signOut = (scope: 'others' | 'this') =>
		grownupFetch('/api/grown-up/devices', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ scope })
		});

	async function others() {
		failed = done = false;
		const res = await signOut('others');
		done = res.ok;
		failed = !res.ok;
	}

	async function thisDevice() {
		failed = false;
		const res = await signOut('this');
		// A full load, so nothing from this session stays in the page.
		if (res.ok) location.assign('/login');
		else failed = true;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Sign-in and devices</title>
</svelte:head>

<BackHeader href="/grown-up/settings" label="Settings" />
<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Sign-in and devices</h1>

{#if done}<DoneNotice text="Other devices signed out" />{/if}
{#if failed}<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>{/if}

{#if email}
	<div class="flex flex-col gap-1.5 rounded-[20px] bg-card p-4">
		<span class="text-[14px] font-black text-muted">Signed in with Google</span>
		<span class="font-heading text-[22px] break-all">{email}</span>
	</div>
{/if}
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
	Children’s tablets use this same account. Grown-up screens always need the PIN, on any device.
</p>
<button
	type="button"
	onclick={others}
	class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-[#7A3A4A] font-heading text-[19px] text-danger"
	>Sign out all other devices</button
>
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">Use this if a tablet or phone is lost. Every other device is signed out.</p>
<button type="button" onclick={thisDevice} class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px]">Sign out of this device</button>
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">To add a device, open the web address on it and sign in with Google.</p>
