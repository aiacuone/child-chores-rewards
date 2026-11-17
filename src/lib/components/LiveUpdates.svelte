<script lang="ts">
	// Live updates between devices (ADR 0006). Every few seconds, and as soon as
	// the app comes back into view, ask whether the family has changed. When it
	// has, reload the page's data. Nothing is drawn.
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	/** The family's version that the page's data was loaded at. */
	let { version }: { version: number } = $props();

	const EVERY = 4000;

	onMount(() => {
		let busy = false;
		const check = async () => {
			if (busy || document.hidden) return;
			busy = true;
			try {
				const res = await fetch('/api/changes', { cache: 'no-store' });
				if (res.ok) {
					const now = ((await res.json()) as { version: number }).version;
					if (now !== version) await invalidateAll();
				}
			} catch {
				// Offline for a moment: try again next time.
			} finally {
				busy = false;
			}
		};
		const timer = setInterval(check, EVERY);
		const onShow = () => {
			if (!document.hidden) check();
		};
		document.addEventListener('visibilitychange', onShow);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', onShow);
		};
	});
</script>
