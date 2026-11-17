<script lang="ts" module>
	export type Tab = 'home' | 'chores' | 'rewards' | 'ranks' | 'settings';
</script>

<script lang="ts">
	// The grown-up tab bar, as in the grown-up screens (for example Ranks.dc.html).
	// The current tab is orange and marked with aria-current, so it is not shown
	// by colour alone.
	let { current }: { current: Tab } = $props();

	const tabs: { id: Tab; label: string; href: string }[] = [
		{ id: 'home', label: 'Home', href: '/grown-up' },
		{ id: 'chores', label: 'Chores', href: '/grown-up/chores' },
		{ id: 'rewards', label: 'Rewards', href: '/grown-up/rewards' },
		{ id: 'ranks', label: 'Ranks', href: '/grown-up/ranks' },
		{ id: 'settings', label: 'Settings', href: '/grown-up/settings' }
	];
</script>

<nav
	aria-label="Grown-up"
	class="fixed right-3 bottom-4 left-3 z-10 mx-auto flex max-w-[366px] gap-1 rounded-[22px] border-2 border-line bg-card p-[5px]"
>
	{#each tabs as tab (tab.id)}
		<a
			href={tab.href}
			aria-current={tab.id === current ? 'page' : undefined}
			class={[
				'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[13px] font-black',
				tab.id === current ? 'bg-hi text-ink-on-orange' : 'text-muted'
			]}
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
			>
				{#if tab.id === 'home'}
					<path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
				{:else if tab.id === 'chores'}
					<path d="M8 6h13M8 12h13M8 18h13" /><circle cx="4" cy="6" r="1" /><circle
						cx="4"
						cy="12"
						r="1"
					/><circle cx="4" cy="18" r="1" />
				{:else if tab.id === 'rewards'}
					<g stroke-width="2.2">
						<rect x="3" y="9" width="18" height="12" rx="2" /><path d="M3 13h18M12 9v12" /><path
							d="M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"
						/>
					</g>
				{:else if tab.id === 'ranks'}
					<path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8z" />
				{:else}
					<g stroke-width="2">
						<circle cx="12" cy="12" r="3" /><path
							d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"
						/>
					</g>
				{/if}
			</svg>
			{tab.label}
		</a>
	{/each}
</nav>
