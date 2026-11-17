<script lang="ts">
	// The chore form: New chore (Add-Stop.dc.html) and Edit chore (Edit-Stop.dc.html).
	// Temporary fixes: no Repeats picker until #21 (every chore is daily), and no
	// "Use my own photo" until #36.
	import ChoreIcon from '#lib/components/ChoreIcon.svelte';
	import { CHORE_ICONS, CHORE_STARS, MAX_CHORE_NAME } from '#lib/chore-icons.ts';
	import { SAVE_FAILED, type ChoreFields, type Kid } from '#lib/chores.ts';

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

	const ready = $derived(chore.name.trim().length > 0 && !saving);

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
		const ok = await onsave({ ...chore, name: chore.name.trim() }).catch(() => false);
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

	<div class="flex min-h-14 items-center gap-3 rounded-2xl bg-card px-3.5">
		<span id="stars-label" class="flex-1 font-black">Stars</span>
		<button
			type="button"
			aria-label="Fewer stars"
			disabled={chore.stars <= CHORE_STARS.min}
			onclick={() => (chore.stars = Math.max(CHORE_STARS.min, chore.stars - CHORE_STARS.step))}
			class="flex size-11 items-center justify-center rounded-full bg-label text-[24px] font-black text-ink disabled:opacity-40"
			>−</button
		>
		<output
			aria-labelledby="stars-label"
			aria-live="polite"
			class="w-10 text-center font-heading text-[24px] text-amber">{chore.stars}</output
		>
		<button
			type="button"
			aria-label="More stars"
			disabled={chore.stars >= CHORE_STARS.max}
			onclick={() => (chore.stars = Math.min(CHORE_STARS.max, chore.stars + CHORE_STARS.step))}
			class="flex size-11 items-center justify-center rounded-full bg-label text-ink disabled:opacity-40"
		>
			<svg
				aria-hidden="true"
				width="22"
				height="22"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg
			>
		</button>
	</div>

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
