<script lang="ts">
	// The reward form: New reward (Add-Reward.dc.html) and Edit reward (the same
	// form, decided in #26).
	import type { Snippet } from 'svelte';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import ChildPicker from '#lib/components/ChildPicker.svelte';
	import PhotoField from '#lib/components/PhotoField.svelte';
	import PhotoFlow from '#lib/components/PhotoFlow.svelte';
	import RewardPlanet from '#lib/components/RewardPlanet.svelte';
	import { PhotoDraft } from '#lib/photo-draft.svelte.ts';
	import { SAVE_FAILED, type Kid } from '#lib/chores.ts';
	import { MAX_REWARD_NAME, REWARD_COST, type RewardFields } from '#lib/rewards.ts';
	import { PLANET_IDS, PLANETS } from '#lib/reward-planets.ts';

	let {
		title,
		submitLabel,
		kids,
		initial,
		photo = null,
		backHref = '/grown-up/rewards',
		photoProblem = false,
		onsave,
		onsaved,
		onphotofailed,
		after
	}: {
		title: string;
		submitLabel: string;
		kids: Kid[];
		initial: RewardFields;
		/** The address of the saved photo, if any. */
		photo?: string | null;
		backHref?: string;
		/** A new reward saved earlier but its photo did not. */
		photoProblem?: boolean;
		/** Save the reward; resolves its id, or null when it did not save. */
		onsave: (reward: RewardFields) => Promise<number | null>;
		/** Everything saved, including any photo. */
		onsaved: (id: number) => unknown;
		/** The reward saved but its photo did not. A new reward moves to its edit page. */
		onphotofailed?: (id: number) => unknown;
		/** Shown below the form, hidden with it behind the photo screens. */
		after?: Snippet;
	} = $props();

	const savedPhoto = () => photo;
	const draft = new PhotoDraft(savedPhoto());
	const startProblem = () => photoProblem;
	let photoFailed = $state(startProblem());

	// The form edits its own copy of the starting values. The stars box is a
	// number input, so its value is null while it is empty.
	const start = () => ({ ...initial, childIds: [...initial.childIds] });
	let reward = $state(start());
	let cost = $state<number | null>(start().cost);
	let saving = $state(false);
	let failed = $state(false);

	const validCost = $derived(
		cost !== null && Number.isInteger(cost) && cost >= REWARD_COST.min && cost <= REWARD_COST.max
	);
	const ready = $derived(reward.name.trim().length > 0 && validCost && !saving);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (!ready) return;
		saving = true;
		failed = false;
		photoFailed = false;
		const id = await onsave({ ...reward, name: reward.name.trim(), cost: cost! }).catch(() => null);
		if (id === null) {
			saving = false;
			failed = true;
			return;
		}
		const photoSaved = await draft.apply('reward', id).catch(() => false);
		saving = false;
		if (photoSaved) await onsaved(id);
		else {
			photoFailed = true;
			await onphotofailed?.(id);
		}
	}
</script>

{#if draft.screen}
	<PhotoFlow kind="reward" {draft} name={reward.name} planet={reward.colour} />
{/if}

<div class={draft.screen ? 'hidden' : 'flex flex-col gap-3.5'}>
<BackHeader href={backHref} label="Rewards" />
<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">{title}</h1>

<div class="flex justify-center">
	<RewardPlanet colour={reward.colour} photo={draft.preview} size={130} />
</div>

<form onsubmit={submit} class="flex flex-col gap-3.5">
	<div class="flex flex-col gap-1.5">
		<label for="reward-name" class="text-[14px] font-black text-muted">Reward name</label>
		<input
			id="reward-name"
			type="text"
			maxlength={MAX_REWARD_NAME}
			autocomplete="off"
			placeholder="e.g. Trip to the pool"
			bind:value={reward.name}
			class="min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink placeholder:text-muted"
		/>
	</div>

	<div class="flex flex-col gap-1.5">
		<label for="reward-cost" class="text-[14px] font-black text-muted">Stars needed</label>
		<input
			id="reward-cost"
			type="number"
			inputmode="numeric"
			min={REWARD_COST.min}
			max={REWARD_COST.max}
			step="1"
			bind:value={cost}
			aria-invalid={cost !== null && !validCost}
			class="min-h-[54px] rounded-2xl border-2 border-line bg-card px-4 text-[17px] font-extrabold text-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
		/>
		{#if cost !== null && !validCost}
			<p role="alert" class="m-0 text-[14px] font-black text-amber">
				Use a whole number from {REWARD_COST.min} to {REWARD_COST.max}.
			</p>
		{/if}
	</div>

	<ChildPicker {kids} bind:selected={reward.childIds} />

	<fieldset class="m-0 flex flex-col gap-1.5 border-0 p-0">
		<legend class="mb-1.5 p-0 text-[14px] font-black text-muted">Planet colour</legend>
		<div class="flex gap-3">
			{#each PLANET_IDS as id (id)}
				{@const p = PLANETS[id]}
				<label
					class={[
						'relative flex size-[52px] cursor-pointer items-center justify-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-hi',
						reward.colour === id && 'shadow-[0_0_0_3px_var(--color-bg),0_0_0_5px_var(--color-ink)]'
					]}
					style="background:{p.body}"
				>
					<input
						type="radio"
						name="reward-colour"
						value={id}
						bind:group={reward.colour}
						aria-label={p.label}
						class="absolute inset-0 m-0 cursor-pointer appearance-none rounded-full"
					/>
				</label>
			{/each}
		</div>
	</fieldset>

	<div class="flex flex-col gap-1.5">
		<span class="text-[14px] font-black text-muted">Picture</span>
		<PhotoField {draft} round />
	</div>

	{#if failed}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>
	{/if}
	{#if photoFailed}
		<p role="alert" class="m-0 text-[16px] font-black text-amber">
			The reward saved, but its photo didn’t. Try adding the photo again.
		</p>
	{/if}

	<button
		type="submit"
		disabled={!ready}
		class="flex min-h-14 items-center justify-center rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731] disabled:opacity-50"
		>{submitLabel}</button
	>
</form>
{@render after?.()}
</div>
