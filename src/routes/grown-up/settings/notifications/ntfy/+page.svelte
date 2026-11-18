<script lang="ts">
	// Set up ntfy (Ntfy.dc.html). The topic is secret, so it shows only in grown-up mode.
	import { onMount } from 'svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import { grownupFetch } from '#lib/grownup.svelte.ts';
	import { fetchSettings } from '#lib/settings-client.ts';

	let topic = $state('');
	let status = $state<'idle' | 'busy' | 'sent' | 'failed'>('idle');

	onMount(async () => (topic = (await fetchSettings())?.topic ?? ''));

	async function test() {
		status = 'busy';
		const res = await grownupFetch('/api/grown-up/settings/test-alert', { method: 'POST' });
		status = res.ok ? 'sent' : 'failed';
	}
	const STEPS = [
		'Install ntfy on each grown-up’s phone',
		'Tap + and paste the topic',
		'Send a test below'
	];
</script>

<svelte:head>
	<title>Rocket Rewards: Set up ntfy</title>
</svelte:head>

<BackHeader href="/grown-up/settings/notifications" label="Notifications" />
<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Set up ntfy</h1>
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
	ntfy sends alerts to your phone. Install the free ntfy app, then subscribe to this topic.
</p>
<div class="flex flex-col gap-1.5">
	<label for="topic" class="text-[14px] font-black text-muted">Topic</label>
	<input
		id="topic"
		type="text"
		readonly
		value={topic}
		class="min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink"
	/>
</div>
<p class="m-0 text-[16px] leading-[1.45] font-bold text-amber">
	Keep the topic secret. Alerts go through the public ntfy.sh server, so anyone who knows the topic
	could read them. They never include names.
</p>
<ol class="m-0 flex list-none flex-col gap-2 p-0">
	{#each STEPS as step, i (step)}
		<li class="flex min-h-[52px] items-center gap-3 rounded-2xl bg-card px-3.5 py-1.5">
			<span
				aria-hidden="true"
				class="flex size-[30px] flex-none items-center justify-center rounded-full bg-hi font-black text-ink-on-orange"
				>{i + 1}</span
			>
			<span class="font-extrabold">{step}</span>
		</li>
	{/each}
</ol>
{#if status === 'sent'}
	<p role="status" class="m-0 text-[16px] font-black text-ok">Test alert sent</p>
{:else if status === 'failed'}
	<p role="alert" class="m-0 text-[16px] font-black text-amber">
		The test alert didn't send. Try again.
	</p>
{/if}
<button type="button" disabled={status === 'busy'} onclick={test} class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]">
	<svg
		aria-hidden="true"
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.2"
		stroke-linecap="round"
		stroke-linejoin="round"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 003.4 0" /></svg
	>Send a test alert
</button>
