<script lang="ts">
	// Test-only preview of the Rocket component at every rank, and the tab bar.
	import GrownupTabs from '#lib/components/GrownupTabs.svelte';
	import Rocket from '#lib/components/Rocket.svelte';
	import { RANKS } from '#lib/ranks.ts';
</script>

<svelte:head>
	<title>Rocket preview</title>
</svelte:head>

<main class="flex flex-col gap-6 p-5 pb-32">
	<h1 class="font-heading text-[34px] leading-none">Rockets</h1>
	{#each [{ name: 'Mia', colour: 'var(--color-mia)' }, { name: 'Leo', colour: 'var(--color-leo)' }] as child (child.name)}
		<ul class="flex flex-wrap items-end gap-4" aria-label={child.name}>
			{#each RANKS as r (r.name)}
				<li class="flex flex-col items-center gap-1" data-testid="{child.name}-{r.name}">
					<Rocket colour={child.colour} rank={r.name} />
					<span class="text-[13px] text-muted">{r.name}</span>
				</li>
			{/each}
			<li class="flex flex-col items-center gap-1" data-testid="{child.name}-small">
				<Rocket colour={child.colour} rank="Commander" height={32} />
				<span class="text-[13px] text-muted">32 px</span>
			</li>
		</ul>
	{/each}
	<GrownupTabs current="ranks" />
</main>
