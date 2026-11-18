<script lang="ts" generics="T extends number">
	// A list of round choices, as on Auto-Lock and Auto-Return. They are real radio
	// buttons, so a keyboard and a screen reader can use them.
	let {
		legend,
		options,
		value,
		label,
		onchange
	}: {
		legend: string;
		options: readonly T[];
		value: T;
		label: (option: T) => string;
		onchange: (option: T) => void;
	} = $props();
	const name = $props.id();
</script>

<fieldset class="m-0 flex flex-col gap-3.5 border-0 p-0">
	<legend class="sr-only">{legend}</legend>
	{#each options as option (option)}
		{@const on = option === value}
		<label
			class={[
				'flex min-h-[58px] cursor-pointer items-center gap-3 rounded-[18px] border-2 bg-card px-4 text-[16px] font-black has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink',
				on ? 'border-hi' : 'border-card'
			]}
		>
			<input
				type="radio"
				{name}
				class="sr-only"
				checked={on}
				onchange={() => onchange(option)}
			/>
			<span
				aria-hidden="true"
				class={[
					'flex size-6 items-center justify-center rounded-full border-[3px]',
					on ? 'border-hi' : 'border-track'
				]}
			>
				{#if on}<span class="size-2.5 rounded-full bg-hi"></span>{/if}
			</span>
			{label(option)}
		</label>
	{/each}
</fieldset>
