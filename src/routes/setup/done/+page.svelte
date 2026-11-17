<script lang="ts">
	// "You're all set!" (design/screens/Setup-Done.dc.html). Both buttons go to the
	// home page for now: Add-Stop comes with #20 and the grown-up Home with #19.
</script>

<svelte:head>
	<title>Rocket Rewards: You’re all set!</title>
</svelte:head>

<div class="flex flex-col gap-[18px] px-0.5 pt-[84px]">
	<div class="flex justify-center">
		<svg aria-hidden="true" width="150" height="150" viewBox="0 0 100 100" class="block">
			<circle cx="50" cy="50" r="34" fill="var(--color-bonus-planet)" />
			<circle cx="38" cy="40" r="7" fill="#c69437" />
			<circle cx="60" cy="62" r="9" fill="#c69437" />
			<ellipse
				cx="50"
				cy="50"
				rx="48"
				ry="12"
				fill="none"
				stroke="#ffd951"
				stroke-width="5"
				transform="rotate(-18 50 50)"
			/>
		</svg>
	</div>
	<h1 class="m-0 text-center font-heading text-[40px] leading-[1.05] font-normal">You’re all set!</h1>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
		Add the first chores, then your children can start their trips.
	</p>
	<div class="mt-[30px] flex flex-col gap-2.5">
		<a
			href="/"
			class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
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
				stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg
			>
			Add the first chore
		</a>
		<a
			href="/"
			class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-line bg-card font-heading text-[19px] text-ink"
		>
			Do it later
		</a>
	</div>
</div>
