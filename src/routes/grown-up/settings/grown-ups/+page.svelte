<script lang="ts">
	// Grown-ups (Grown-ups.dc.html, Grown-ups-Invited.dc.html). Cancelling an invite
	// and removing a grown-up are not drawn, so they use the confirm pop-up.
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ConfirmCard from '#lib/components/ConfirmCard.svelte';
	import DoneNotice from '#lib/components/DoneNotice.svelte';
	import LiveUpdates from '#lib/components/LiveUpdates.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { grownupFetch } from '#lib/grownup.svelte.ts';

	type Person = {
		id: number;
		name: string;
		email: string;
		you: boolean;
		owner: boolean;
		canRemove: boolean;
	};
	type Invite = { id: number; name: string; email: string; expired: boolean };
	type Loaded = { version: number; people: Person[]; invites: Invite[] };
	type Asking = { kind: 'invite'; item: Invite } | { kind: 'person'; item: Person };

	let loaded = $state<Loaded | null>(null);
	let asking = $state<Asking | null>(null);
	let notice = $state('');
	let problem = $state('');

	async function load() {
		const res = await grownupFetch('/api/grown-up/grown-ups');
		if (res.ok) loaded = (await res.json()) as Loaded;
	}
	onMount(load);

	async function confirm(a: Asking) {
		asking = null;
		problem = '';
		notice = '';
		const url =
			a.kind === 'invite'
				? `/api/grown-up/grown-ups/invites/${a.item.id}`
				: `/api/grown-up/grown-ups/${a.item.id}`;
		const res = await grownupFetch(url, { method: 'DELETE' });
		if (!res.ok) problem = SAVE_FAILED;
		else notice = a.kind === 'invite' ? 'Invite cancelled' : `${a.item.name} was removed`;
		await load();
	}

	const ROW = 'flex min-h-[60px] w-full items-center gap-3 rounded-[18px] bg-card py-1.5 pr-3.5 pl-2.5 text-left';
	const PILL = 'inline-flex h-[26px] flex-none items-center rounded-full px-2.5 text-[13px] font-black';
</script>

<svelte:head>
	<title>Rocket Rewards: Grown-ups</title>
</svelte:head>

{#snippet details(name: string, line: string, colour: string)}
	<span class="flex size-10 flex-none items-center justify-center rounded-xl bg-label">
		<svg
			aria-hidden="true"
			width="26"
			height="26"
			viewBox="0 0 24 24"
			fill="none"
			stroke={colour}
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="M12 4a4 4 0 100 8 4 4 0 000-8z M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg
		>
	</span>
	<span class="min-w-0 flex-1">
		<span class="block text-[16px] font-black break-words">{name}</span>
		<span class="mt-0.5 block text-[13px] font-bold break-words text-muted">{line}</span>
	</span>
{/snippet}

<BackHeader href="/grown-up/settings" label="Settings" />

{#if page.state.invited && !notice}
	<DoneNotice text="Invite sent to {page.state.invited}" />
{/if}
{#if notice}
	<DoneNotice text={notice} />
{/if}

<h1 class="m-0 font-heading text-[34px] leading-[1.05] font-normal">Grown-ups</h1>

{#if problem}
	<p role="alert" class="m-0 text-[16px] font-black text-amber">{problem}</p>
{/if}

{#if loaded}
	<LiveUpdates version={loaded.version} onchange={load} />
	<div class="flex flex-col gap-2">
		{#each loaded.people as person (person.id)}
			{#if person.canRemove}
				<button type="button" class={ROW} onclick={() => (asking = { kind: 'person', item: person })}>
					{@render details(person.name, person.email, 'var(--color-ok)')}
					<span class="{PILL} border border-[#7A3A4A] text-danger">Remove</span>
				</button>
			{:else}
				<div class={ROW}>
					{@render details(person.you ? 'You' : person.name, person.email, 'var(--color-ok)')}
					{#if person.owner}<span class="{PILL} bg-ok/20 text-ok">Owner</span>{/if}
				</div>
			{/if}
		{/each}
		{#each loaded.invites as invite (invite.id)}
			<button type="button" class={ROW} onclick={() => (asking = { kind: 'invite', item: invite })}>
				{@render details(
					invite.name,
					`${invite.email} · ${invite.expired ? 'invite expired' : 'invite sent'}`,
					'var(--color-amber)'
				)}
				{#if invite.expired}
					<span class="{PILL} bg-label text-muted">Expired</span>
				{:else}
					<span class="{PILL} bg-amber/20 text-amber">Waiting</span>
				{/if}
			</button>
		{/each}
	</div>

	<a
		href="/grown-up/settings/grown-ups/invite"
		class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] border-2 border-line bg-card font-heading text-[19px]"
	>
		<svg
			aria-hidden="true"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.4"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="flex-none"><path d="M12 5v14M5 12h14" /></svg
		>Invite a grown-up
	</a>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		Each grown-up signs in with their own Google account. All grown-ups share one PIN. Every grown-up
		gets the ntfy alerts.
	</p>
{/if}

{#if asking}
	{@const a = asking}
	{#if a.kind === 'invite'}
		<ConfirmCard
			title="Cancel invite?"
			text="{a.item.email} won’t be able to join with this invite."
			confirmLabel="Yes, cancel invite"
			cancelLabel="Keep invite"
			onconfirm={() => confirm(a)}
			oncancel={() => (asking = null)}
		/>
	{:else}
		<ConfirmCard
			title="Remove {a.item.name}?"
			text="{a.item.name} will be signed out on every device and will need a new invite to come back."
			confirmLabel="Yes, remove {a.item.name}"
			cancelLabel="Keep {a.item.name}"
			onconfirm={() => confirm(a)}
			oncancel={() => (asking = null)}
		/>
	{/if}
{/if}
