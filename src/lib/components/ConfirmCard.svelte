<script lang="ts">
	// A pop-up asking to confirm something that cannot be undone, in the style of
	// "Locking soon". The safe choice is orange and has the focus.
	import { onMount } from 'svelte';

	let {
		title,
		text,
		confirmLabel,
		cancelLabel,
		onconfirm,
		oncancel
	}: {
		title: string;
		text: string;
		confirmLabel: string;
		cancelLabel: string;
		onconfirm: () => void;
		oncancel: () => void;
	} = $props();

	let safe = $state<HTMLButtonElement>();
	onMount(() => safe?.focus());
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && oncancel()} />

<div class="fixed inset-0 z-[8] flex items-center justify-center bg-[rgba(5,8,24,.7)] p-6">
	<div
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="confirm-title"
		aria-describedby="confirm-text"
		class="flex w-full max-w-[380px] flex-col items-center gap-3.5 rounded-[26px] border-2 border-line bg-card p-6 text-center"
	>
		<h2 id="confirm-title" class="m-0 font-heading text-[28px] leading-[1.05] font-normal">
			{title}
		</h2>
		<p id="confirm-text" class="m-0 text-[16px] leading-[1.45] font-bold text-muted">{text}</p>
		<div class="flex w-full flex-col gap-2.5">
			<button
				bind:this={safe}
				type="button"
				onclick={oncancel}
				class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]"
				>{cancelLabel}</button
			>
			<button
				type="button"
				onclick={onconfirm}
				class="flex min-h-14 items-center justify-center rounded-[20px] border-2 border-[#7A3A4A] font-heading text-[19px] text-danger"
				>{confirmLabel}</button
			>
		</div>
	</div>
</div>
