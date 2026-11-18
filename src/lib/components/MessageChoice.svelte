<script lang="ts">
	// Pick a kind message, or write your own (Not-Done.dc.html, Claim-Decline.dc.html).
	// `message` is the text to send: the picked choice, or the typed one, trimmed.
	import { MAX_MESSAGE } from '#lib/check.ts';

	let {
		choices,
		message = $bindable('')
	}: {
		choices: readonly string[];
		message: string;
	} = $props();

	const OWN = 'own';
	// The first choice is picked to start with.
	const first = () => choices[0];
	let picked = $state<string>(first());
	let own = $state('');

	$effect(() => {
		message = picked === OWN ? own.trim() : picked;
	});
</script>

<fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
	<legend class="sr-only">Message</legend>
	{#each [...choices, OWN] as choice (choice)}
		{@const on = picked === choice}
		<label
			class={[
				'flex min-h-[58px] cursor-pointer items-center gap-3 rounded-[18px] border-2 bg-card px-4 text-[16px] font-black has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-hi',
				on ? 'border-hi' : 'border-card'
			]}
		>
			<input type="radio" name="message" value={choice} bind:group={picked} class="sr-only" />
			<span
				aria-hidden="true"
				class={[
					'flex size-6 flex-none items-center justify-center rounded-full border-[3px]',
					on ? 'border-hi' : 'border-line'
				]}
			>
				{#if on}<span class="size-2.5 rounded-full bg-hi"></span>{/if}
			</span>
			{choice === OWN ? 'Write my own message…' : choice}
		</label>
	{/each}
</fieldset>

{#if picked === OWN}
	<label class="flex flex-col gap-1.5">
		<span class="text-[15px] font-black text-muted">Your message</span>
		<input
			type="text"
			bind:value={own}
			maxlength={MAX_MESSAGE}
			required
			class="min-h-14 rounded-[18px] border-2 border-line bg-card px-4 text-[16px] font-bold text-ink"
		/>
	</label>
{/if}
