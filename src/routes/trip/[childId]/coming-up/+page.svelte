<script lang="ts">
	// Coming up (Child-Coming.dc.html): chores due on the next 6 days, not today.
	import ChoreIcon from '#lib/components/ChoreIcon.svelte';
	import PhotoImage from '#lib/components/PhotoImage.svelte';

	let { data } = $props();
	const trip = $derived(`/trip/${data.child.id}`);
</script>

<svelte:head>
	<title>Rocket Rewards: Coming up</title>
</svelte:head>

<div class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-3 px-[22px] pt-[26px] pb-10">
	<a
		href={trip}
		aria-label="Back"
		class="mb-1.5 flex size-12 flex-none items-center justify-center rounded-full bg-card text-ink"
	>
		<svg
			aria-hidden="true"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.4"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="M15 5l-7 7 7 7" /></svg
		>
	</a>
	<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Coming up</h1>
	<p class="m-0 text-[15px] font-bold text-muted">Not today. These stops show up on other days.</p>

	<ul class="m-0 flex list-none flex-col gap-2 p-0">
		{#each data.chores as chore (chore.choreId)}
			<li class="flex min-h-[72px] items-center gap-3 rounded-[18px] bg-card px-2.5 py-2">
				<PhotoImage src={chore.photo} size={48} radius="50%">
					{#snippet fallback()}
						<span
							class="flex size-12 flex-none items-center justify-center rounded-full bg-label text-muted"
						>
							<ChoreIcon icon={chore.icon} size={22} />
						</span>
					{/snippet}
				</PhotoImage>
				<span class="min-w-0 flex-1">
					<span class="block font-heading text-[18px] leading-[1.1]">{chore.name}</span>
					<span class="block text-[13px] font-bold text-muted">+{chore.stars} stars</span>
				</span>
				<span class="flex-none rounded-full bg-amber/20 px-2.5 py-1 text-[13px] font-black text-amber"
					>{chore.day}</span
				>
			</li>
		{/each}
	</ul>

	<a
		href={trip}
		class="mt-4 flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
		>Back to my trip</a
	>
</div>
