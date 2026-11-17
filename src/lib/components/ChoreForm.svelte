<script lang="ts">
	// The chore form: New chore (Add-Stop.dc.html) and Edit chore (Edit-Stop.dc.html).
	// Temporary fix: no "Use my own photo" until #36.
	import ChoreIcon from '#lib/components/ChoreIcon.svelte';
	import Stepper from '#lib/components/Stepper.svelte';
	import {
		CHORE_ICONS,
		CHORE_STARS,
		MAX_CHORE_NAME,
		MAX_EXPECTATIONS
	} from '#lib/chore-icons.ts';
	import { SAVE_FAILED, type ChoreFields, type Kid } from '#lib/chores.ts';
	import {
		REPEAT_KINDS,
		REPEAT_LABELS,
		REPEAT_LIMITS,
		WEEKDAYS,
		choreDay,
		onceChoices,
		ordinal,
		weekday,
		type RepeatInput
	} from '#lib/repeat.ts';

	let {
		title,
		submitLabel,
		kids,
		initial,
		onsave
	}: {
		title: string;
		submitLabel: string;
		kids: Kid[];
		initial: ChoreFields;
		/** Save the chore; resolves false when it did not save. */
		onsave: (chore: ChoreFields) => Promise<boolean>;
	} = $props();

	// The form edits its own copy of the starting values.
	const start = () => ({ ...initial, childIds: [...initial.childIds] });
	let chore = $state(start());
	let saving = $state(false);
	let failed = $state(false);

	// Every kind keeps its own setting, so switching Weekly to Monthly and back
	// keeps the days ticked. Each starts from today.
	const today = choreDay(new Date());
	const days = onceChoices(today);
	const startRepeat = () => ({
		kind: initial.repeat.kind,
		weekDays: initial.repeat.kind === 'weekly' ? [...initial.repeat.days] : [weekday(today)],
		monthDay: initial.repeat.kind === 'monthly' ? initial.repeat.day : +today.slice(8, 10),
		every: initial.repeat.kind === 'custom' ? initial.repeat.every : 2,
		unit: initial.repeat.kind === 'custom' ? initial.repeat.unit : ('days' as 'days' | 'weeks'),
		// A saved Once date that has passed is not one of the choices, so nothing is picked.
		onceDate:
			initial.repeat.kind === 'once'
				? initial.repeat.date
				: (null as string | null)
	});
	const r = $state(startRepeat());

	const repeat = $derived.by((): RepeatInput | null => {
		switch (r.kind) {
			case 'daily':
				return { kind: 'daily' };
			case 'weekly':
				return r.weekDays.length ? { kind: 'weekly', days: [...r.weekDays].sort() } : null;
			case 'monthly':
				return { kind: 'monthly', day: r.monthDay };
			case 'custom':
				return { kind: 'custom', every: r.every, unit: r.unit };
			case 'once':
				return r.onceDate ? { kind: 'once', date: r.onceDate } : null;
		}
	});

	const ready = $derived(chore.name.trim().length > 0 && repeat !== null && !saving);

	function toggleDay(d: number) {
		r.weekDays = r.weekDays.includes(d) ? r.weekDays.filter((x) => x !== d) : [...r.weekDays, d];
	}

	function toggle(id: number) {
		chore.childIds = chore.childIds.includes(id)
			? chore.childIds.filter((c) => c !== id)
			: [...chore.childIds, id];
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!ready) return;
		saving = true;
		failed = false;
		const ok = await onsave({
			...chore,
			name: chore.name.trim(),
			expectations: chore.expectations.trim(),
			repeat: repeat!
		}).catch(
			() => false
		);
		saving = false;
		failed = !ok;
	}
</script>

<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">{title}</h1>

<form onsubmit={submit} class="flex flex-col gap-3.5">
	<div class="flex flex-col gap-1.5">
		<label for="chore-name" class="text-[14px] font-black text-muted">Chore name</label>
		<input
			id="chore-name"
			type="text"
			maxlength={MAX_CHORE_NAME}
			autocomplete="off"
			placeholder="e.g. Water the plants"
			bind:value={chore.name}
			class="min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink placeholder:text-muted"
		/>
	</div>

	<div class="flex flex-col gap-1.5">
		<label for="chore-expectations" class="text-[14px] font-black text-muted">Expectations</label>
		<input
			id="chore-expectations"
			type="text"
			maxlength={MAX_EXPECTATIONS}
			autocomplete="off"
			placeholder="e.g. Put every toy back in the box"
			bind:value={chore.expectations}
			class="min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink placeholder:text-muted"
		/>
	</div>

	<fieldset class="m-0 flex flex-col gap-1.5 border-0 p-0">
		<legend class="mb-1.5 p-0 text-[14px] font-black text-muted">Picture</legend>
		<div class="grid grid-cols-6 gap-1.5">
			{#each CHORE_ICONS as icon (icon.id)}
				<label
					class={[
						'relative flex min-h-12 cursor-pointer items-center justify-center rounded-[14px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-hi',
						chore.icon === icon.id ? 'bg-hi text-ink-on-orange' : 'bg-card text-muted'
					]}
				>
					<input
						type="radio"
						name="chore-icon"
						value={icon.id}
						bind:group={chore.icon}
						aria-label={icon.label}
						class="absolute inset-0 m-0 cursor-pointer appearance-none"
					/>
					<ChoreIcon icon={icon.id} size={26} />
				</label>
			{/each}
		</div>
	</fieldset>

	<Stepper
		label="Stars"
		bind:value={chore.stars}
		min={CHORE_STARS.min}
		max={CHORE_STARS.max}
		step={CHORE_STARS.step}
		less="Fewer stars"
		more="More stars"
	/>

	<div class="flex flex-col gap-1.5">
		<span id="who-label" class="text-[14px] font-black text-muted">Who does it?</span>
		<div role="group" aria-labelledby="who-label" class="flex flex-wrap gap-2">
			{#each kids as kid (kid.id)}
				{@const on = chore.childIds.includes(kid.id)}
				<button
					type="button"
					aria-pressed={on}
					onclick={() => toggle(kid.id)}
					class={[
						'flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 font-black',
						on ? 'text-ink' : 'border-line bg-card text-muted'
					]}
					style={on
						? `border-color:${kid.colour};background:color-mix(in srgb, ${kid.colour} 22%, transparent)`
						: undefined}
				>
					{#if on}
						<svg
							aria-hidden="true"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke={kid.colour}
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="flex-none"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg
						>
					{/if}
					{kid.name}
				</button>
			{/each}
		</div>
	</div>

	<fieldset class="m-0 flex flex-col gap-1.5 border-0 p-0">
		<legend class="mb-1.5 p-0 text-[14px] font-black text-muted">Repeats</legend>
		<div class="flex gap-1 rounded-2xl bg-card p-1">
			{#each REPEAT_KINDS as kind (kind)}
				<label
					class={[
						'relative flex min-h-11 flex-auto cursor-pointer items-center justify-center rounded-xl px-1 text-[13px] font-black has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-hi',
						r.kind === kind ? 'bg-hi text-ink-on-orange' : 'text-muted'
					]}
				>
					<input
						type="radio"
						name="chore-repeat"
						value={kind}
						bind:group={r.kind}
						class="absolute inset-0 m-0 cursor-pointer appearance-none"
					/>
					{REPEAT_LABELS[kind]}
				</label>
			{/each}
		</div>

		{#if r.kind === 'weekly'}
			<div role="group" aria-label="Days" class="flex gap-[5px]">
				{#each WEEKDAYS as day, d (d)}
					{@const on = r.weekDays.includes(d)}
					<button
						type="button"
						aria-pressed={on}
						aria-label={day.long}
						onclick={() => toggleDay(d)}
						class={[
							'flex min-h-11 flex-1 items-center justify-center rounded-xl text-[14px] font-black',
							on ? 'bg-ok text-ink-on-teal' : 'bg-card text-muted'
						]}>{day.letter}</button
					>
				{/each}
			</div>
		{:else if r.kind === 'monthly'}
			<Stepper
				label="Day of the month"
				bind:value={r.monthDay}
				min={REPEAT_LIMITS.monthDay.min}
				max={REPEAT_LIMITS.monthDay.max}
				less="Earlier day"
				more="Later day"
				show={ordinal}
			/>
		{:else if r.kind === 'custom'}
			<Stepper
				label="Every"
				bind:value={r.every}
				min={REPEAT_LIMITS.every.min}
				max={REPEAT_LIMITS.every.max}
				less="Fewer"
				more="More"
			/>
			<div class="flex gap-1 rounded-2xl bg-card p-1">
				{#each [['days', 'Days'], ['weeks', 'Weeks']] as const as [unit, text] (unit)}
					<label
						class={[
							'relative flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl text-[13px] font-black has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-hi',
							r.unit === unit ? 'bg-ok text-ink-on-teal' : 'text-muted'
						]}
					>
						<input
							type="radio"
							name="chore-repeat-unit"
							value={unit}
							bind:group={r.unit}
							class="absolute inset-0 m-0 cursor-pointer appearance-none"
						/>
						{text}
					</label>
				{/each}
			</div>
		{:else if r.kind === 'once'}
			<div role="radiogroup" aria-label="Day" class="grid grid-cols-4 gap-[5px]">
				{#each days as day (day.date)}
					<label
						class={[
							'relative flex min-h-11 cursor-pointer items-center justify-center rounded-xl text-[14px] font-black has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-hi',
							r.onceDate === day.date ? 'bg-ok text-ink-on-teal' : 'bg-card text-muted'
						]}
					>
						<input
							type="radio"
							name="chore-repeat-once"
							value={day.date}
							bind:group={r.onceDate}
							aria-label={day.long}
							class="absolute inset-0 m-0 cursor-pointer appearance-none"
						/>
						{day.label}
					</label>
				{/each}
			</div>
		{/if}
	</fieldset>

	{#if failed}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>
	{/if}

	<button
		type="submit"
		disabled={!ready}
		class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731] disabled:opacity-50"
		>{submitLabel}</button
	>
</form>
