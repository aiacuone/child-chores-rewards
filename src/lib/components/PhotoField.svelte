<script lang="ts">
	// "Use my own photo", or the chosen photo with Change and Remove (Add-Stop-Photo,
	// Add-Reward-Photo).
	import type { PhotoDraft } from '#lib/photo-draft.svelte.ts';

	let { draft, round = false }: { draft: PhotoDraft; round?: boolean } = $props();
</script>

{#if draft.preview}
	<div class="flex items-center gap-3 rounded-2xl border-[3px] border-hi bg-hi/14 py-2 pr-3 pl-2">
		<img
			src={draft.preview}
			alt=""
			width="52"
			height="52"
			class={['size-[52px] flex-none object-cover', round ? 'rounded-full' : 'rounded-xl']}
		/>
		<span class="min-w-0 flex-1 font-black">Your photo</span>
		<button
			type="button"
			class="min-h-11 px-3 font-black text-hi"
			onclick={() => (draft.screen = 'choose')}>Change</button
		>
		<button
			type="button"
			class="min-h-11 px-2.5 font-black text-danger"
			onclick={() => (draft.screen = 'remove')}>Remove</button
		>
	</div>
{:else}
	<button
		type="button"
		onclick={() => (draft.screen = 'choose')}
		class="flex min-h-12 items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-line font-black text-muted"
	>
		<svg
			aria-hidden="true"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"
			><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg
		>Use my own photo
	</button>
{/if}
