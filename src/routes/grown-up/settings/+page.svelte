<script lang="ts">
	// Settings (Settings.dc.html).
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import DoneNotice from '#lib/components/DoneNotice.svelte';
	import { fetchSettings, type SettingsView } from '#lib/settings-client.ts';
	import { minutesLabel, returnLabel, timeLabel } from '#lib/settings.ts';

	let view = $state<SettingsView | null>(null);
	onMount(async () => (view = await fetchSettings()));

	const PERSON = 'M12 4a4 4 0 100 8 4 4 0 000-8z M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7';
	const ICONS = {
		person: PERSON,
		lock: 'M7 11h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z M8 11V8a4 4 0 018 0v3',
		mail: 'M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z M3 7l9 6 9-6',
		phone: 'M9 2h6a2 2 0 012 2v16a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z M11 18h2',
		clock: 'M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v5l3 2',
		bell: 'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.9 1.9 0 003.4 0',
		reset: 'M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.7L3 8 M3 3v5h5'
	};
	const TEAL = 'var(--color-ok)';
	const GOLD = 'var(--color-amber)';
	const ORANGE = 'var(--color-hi)';

	const grownUpsHint = (n: number) => (n === 1 ? 'Just you' : `${n} grown-ups`);

	const rows = $derived.by(() => {
		if (!view) return [];
		const s = view.settings;
		return [
			{
				label: 'Children',
				hint: view.children.join(', '),
				icon: ICONS.person,
				colour: TEAL,
				href: 'children'
			},
			{
				label: 'Grown-ups',
				hint: grownUpsHint(view.grownUps),
				icon: ICONS.person,
				colour: GOLD,
				href: 'grown-ups'
			},
			{
				label: 'Grown-up PIN',
				hint: 'Change your PIN',
				icon: ICONS.lock,
				colour: ORANGE,
				href: 'pin'
			},
			{
				label: 'Recovery email',
				hint: view.recovery ? `${view.recovery} · Verified` : 'Not confirmed yet',
				icon: ICONS.mail,
				colour: TEAL,
				href: 'recovery'
			},
			{
				label: 'Sign-in and devices',
				hint: `Signed in as ${view.signedInAs}`,
				icon: ICONS.phone,
				colour: TEAL,
				href: 'devices'
			},
			{
				label: 'Auto-lock',
				hint: `After ${minutesLabel(s.autoLockMinutes)}`,
				icon: ICONS.clock,
				colour: GOLD,
				href: 'auto-lock'
			},
			{
				label: 'Back to Who’s flying',
				hint: `After ${returnLabel(s.autoReturnSeconds)}`,
				icon: ICONS.person,
				colour: TEAL,
				href: 'auto-return'
			},
			{
				label: 'Notifications',
				hint: 'On · sent with ntfy',
				icon: ICONS.bell,
				colour: GOLD,
				href: 'notifications'
			},
			{
				label: 'Daily reset and bonus',
				hint: `${timeLabel(s.resetMinutes)} · +${s.dailyBonus} stars bonus`,
				icon: ICONS.reset,
				colour: TEAL,
				href: 'daily-reset'
			}
		];
	});
	const ROW = 'flex min-h-[60px] items-center gap-3 rounded-[18px] bg-card py-1.5 pr-3.5 pl-2.5';
</script>

<svelte:head>
	<title>Rocket Rewards: Settings</title>
</svelte:head>

<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Settings</h1>

{#if page.url.searchParams.get('saved') === 'pin'}
	<DoneNotice text="PIN changed" />
{/if}

{#snippet body(row: (typeof rows)[number])}
	<span class="flex size-10 flex-none items-center justify-center rounded-xl bg-label">
		<svg
			aria-hidden="true"
			width="26"
			height="26"
			viewBox="0 0 24 24"
			fill="none"
			stroke={row.colour}
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"><path d={row.icon} /></svg
		>
	</span>
	<span class="min-w-0 flex-1">
		<span class="block text-[16px] font-black">{row.label}</span>
		<span class="mt-0.5 block text-[13px] font-bold break-words text-muted">{row.hint}</span>
	</span>
{/snippet}

<div class="flex flex-col gap-2">
	{#each rows as row (row.label)}
		<a href="/grown-up/settings/{row.href}" class={ROW}>
			{@render body(row)}
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
	{/each}
</div>
