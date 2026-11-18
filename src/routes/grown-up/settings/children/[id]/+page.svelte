<script lang="ts">
	// Edit a child (Child-Edit.dc.html). Temporary fix: the Rocket photo row is left
	// out until #34 builds photos.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ChildForm from '#lib/components/ChildForm.svelte';
	import { fetchChild, saveChild, type ChildDetail } from '#lib/children-client.ts';
	import type { ColourId } from '#lib/colours.ts';

	let child = $state<ChildDetail | null>(null);
	let missing = $state(false);

	onMount(async () => {
		child = await fetchChild(page.params.id);
		missing = !child;
	});

	async function save(id: number, fields: { name: string; colour: ColourId }) {
		const message = await saveChild(id, fields);
		if (!message) await goto('/grown-up/settings/children');
		return message;
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Edit child</title>
</svelte:head>

<BackHeader href="/grown-up/settings/children" label="Children" />

{#if missing}
	<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Child not found</h1>
{:else if child}
	{@const c = child}
	<ChildForm
		title={c.name}
		start={{ name: c.name, colour: c.colourId }}
		taken={c.takenColours}
		rank={c.rank}
		onsave={(fields) => save(c.id, fields)}
	>
		{#snippet rows()}
			<a
				href="/grown-up/settings/children/{c.id}/passcode"
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
						><rect x="5" y="11" width="14" height="10" rx="2" /><path
							d="M8 11V8a4 4 0 018 0v3"
						/></svg
					>
				</span>
				<span class="min-w-0 flex-1">
					<span class="block text-[16px] font-black">Picture passcode</span>
					<span class="mt-0.5 block text-[13px] font-bold text-muted"
						>{c.passcode ? 'On · tap to change' : 'Off · tap to set up'}</span
					>
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
		{/snippet}
	</ChildForm>

	{#if c.canRemove}
		<a
			href="/grown-up/settings/children/{c.id}/remove"
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-[#7A3A4A] font-heading text-[19px] text-danger"
			>Remove {c.name}</a
		>
	{/if}
{/if}
