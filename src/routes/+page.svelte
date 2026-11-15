<script lang="ts">
	// Stand-in until Who's flying is built (features tracker).
	let { data } = $props();
</script>

<svelte:head>
	<title>Rocket Rewards</title>
</svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
	<h1 class="font-heading text-[38px] leading-none">Rocket Rewards</h1>
	<p class="text-[18px] text-muted">Coming soon.</p>
	<p class="text-[16px] text-muted">Signed in as {data.name}.</p>
</main>
