<script lang="ts">
	// A row with an on/off switch, as on Notifications and Auto-Lock. A locked
	// switch stays on: it is shown as dimmed, and says so to screen readers.
	let {
		label,
		hint,
		checked,
		locked = false,
		onchange
	}: {
		label: string;
		hint: string;
		checked: boolean;
		locked?: boolean;
		onchange?: (on: boolean) => void;
	} = $props();
</script>

<div class="flex min-h-[72px] items-center gap-3 rounded-[18px] bg-card px-3.5 py-3">
	<span class="flex-1">
		<span class="block text-[16px] font-black">{label}</span>
		<span class="mt-0.5 block text-[13px] font-bold text-muted">{hint}</span>
	</span>
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		aria-label={label}
		aria-disabled={locked || undefined}
		onclick={() => {
			if (!locked) onchange?.(!checked);
		}}
		class={['block flex-none py-1.5', locked && 'cursor-not-allowed']}
	>
		<span
			class={[
				'relative block h-8 w-14 rounded-full',
				checked ? 'bg-ok' : 'bg-track',
				locked && 'opacity-60'
			]}
		>
			<span
				class={[
					'absolute top-[3px] size-[26px] rounded-full bg-white',
					checked ? 'right-[3px]' : 'left-[3px]'
				]}
			></span>
		</span>
	</button>
</div>
