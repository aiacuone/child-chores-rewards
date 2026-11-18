<script lang="ts">
	// Live updates between devices (ADR 0006). Every few seconds, and as soon as
	// the app comes back into view, ask whether the family has changed. When it
	// has, reload the page's data: with invalidateAll for pages that load on the
	// server, or with `onchange` for grown-up pages, which fetch their own data.
	// Nothing is drawn.
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let {
		version,
		onchange
	}: {
		/** The family's version that the page's data was loaded at. */
		version: number;
		/** Reload the page's data. It must bring a new `version`. */
		onchange?: () => unknown;
	} = $props();

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
					if (now !== version) await (onchange ? onchange() : invalidateAll());
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
