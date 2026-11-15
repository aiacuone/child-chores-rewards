<script lang="ts">
	// Two designed screens share this page: Setup-Welcome before any family
	// exists, Tablet-SignIn after (docs/SPEC.md, "Devices and sign-in").
	let { data } = $props();

	const stars = [
		[324, 267, 0.8], [42, 148, 0.5], [141, 72, 0.8], [306, 9, 0.8], [287, 434, 0.8],
		[46, 647, 0.8], [63, 392, 0.8], [38, 370, 0.8], [348, 293, 0.8], [242, 116, 0.5],
		[179, 73, 0.5], [99, 713, 0.5], [252, 719, 0.5], [182, 530, 0.5], [17, 375, 0.3],
		[214, 292, 0.3], [107, 558, 0.3], [332, 39, 0.3], [239, 672, 0.3], [146, 304, 0.3]
	];
</script>

<svelte:head>
	<title>{data.firstRun ? 'Welcome to Rocket Rewards' : 'Rocket Rewards: Sign in'}</title>
</svelte:head>

<main class="relative min-h-screen overflow-hidden">
	{#each stars as [x, y, o]}
		<span
			aria-hidden="true"
			class="absolute size-[2px] rounded-full bg-white"
			style="left:{(x / 390) * 100}%;top:{y}px;opacity:{o}"
		></span>
	{/each}

	<div
		class="relative z-[2] mx-auto flex max-w-[420px] flex-col gap-[18px] px-6"
		class:pt-20={data.firstRun}
		class:pt-[100px]={!data.firstRun}
	>
		<div class="flex items-end justify-center gap-2">
			<svg aria-hidden="true" width="70" height="130" viewBox="0 0 60 110" class="block">
				<path d="M21 82Q30 112 39 82z" fill="#FF9F5A" />
				<path d="M25 82Q30 100 35 82z" fill="#FFD166" />
				<path d="M30 4C46 18 48 44 46 76H14C12 44 14 18 30 4z" fill="#ECEAF6" />
				<path d="M30 4C40 13 44 26 45 36H15C16 26 20 13 30 4z" fill="var(--color-mia)" />
				<circle cx="30" cy="52" r="9" fill="#24306A" stroke="var(--color-mia)" stroke-width="4" />
				<path d="M14 58L2 84L14 80z" fill="var(--color-mia)" />
				<path d="M46 58L58 84L46 80z" fill="var(--color-mia)" />
			</svg>
			<svg aria-hidden="true" width="54" height="100" viewBox="0 0 60 110" class="block">
				<path d="M21 82Q30 112 39 82z" fill="#FF9F5A" />
				<path d="M25 82Q30 100 35 82z" fill="#FFD166" />
				<path d="M30 4C46 18 48 44 46 76H14C12 44 14 18 30 4z" fill="#ECEAF6" />
				<path d="M30 4C40 13 44 26 45 36H15C16 26 20 13 30 4z" fill="var(--color-leo)" />
				<circle cx="30" cy="52" r="9" fill="#24306A" stroke="var(--color-leo)" stroke-width="4" />
				<path d="M14 58L2 84L14 80z" fill="var(--color-leo)" />
				<path d="M46 58L58 84L46 80z" fill="var(--color-leo)" />
			</svg>
		</div>

		<h1 class="m-0 text-center font-heading text-[40px] leading-[1.05] font-normal">
			{data.firstRun ? 'Welcome to Rocket Rewards' : 'Rocket Rewards'}
		</h1>
		<p class="m-0 text-[16px] leading-[1.45] text-muted">
			{data.firstRun
				? 'Set up takes about 3 minutes. Sign in with Google to keep your family’s chores safe and in sync.'
				: 'Ask a grown-up to sign in. You only need to do this once.'}
		</p>

		{#if data.error}
			<p role="alert" class="m-0 rounded-[16px] bg-card px-4 py-3 text-[16px] text-amber">
				{data.error}
			</p>
		{/if}

		<div class="flex flex-col gap-3" class:mt-[30px]={data.firstRun} class:mt-5={!data.firstRun}>
			<a
				href="/login/google"
				data-sveltekit-reload
				class="flex min-h-14 items-center justify-center rounded-[20px] bg-white text-[17px] font-black text-[#1F1F1F]"
			>
				Continue with Google
			</a>
			{#if data.firstRun}
				<p class="m-0 text-[16px] leading-[1.45] text-muted">We never see your Google password.</p>
			{/if}
		</div>
	</div>
</main>
