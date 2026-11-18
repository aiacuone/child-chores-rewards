<script lang="ts">
	// Daily reset and bonus (Daily-Reset.dc.html). The design shows the time but
	// not how to pick one, so the big time is a list in half-hour steps.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import BackHeader from '#lib/components/BackHeader.svelte';
	import Stepper from '#lib/components/Stepper.svelte';
	import { SAVE_FAILED } from '#lib/chores.ts';
	import { fetchSettings, saveSettings } from '#lib/settings-client.ts';
	import { BONUS_LIMITS, RESET_STEP } from '#lib/settings.ts';

	const HALF_DAY = 12 * 60;
	let loaded = $state(false);
	let inDay = $state(0); // minutes after 12:00, 0 to 11:30
	let pm = $state(false);
	let bonus = $state<number>(BONUS_LIMITS.min);
	let busy = $state(false);
	let failed = $state(false);

	onMount(async () => {
		const s = (await fetchSettings())?.settings;
		if (!s) return;
		inDay = s.resetMinutes % HALF_DAY;
		pm = s.resetMinutes >= HALF_DAY;
		bonus = s.dailyBonus;
		loaded = true;
	});

	const TIMES = Array.from({ length: HALF_DAY / RESET_STEP }, (_, i) => i * RESET_STEP);
	const clock = (m: number) =>
		`${Math.floor(m / 60) || 12}:${String(m % 60).padStart(2, '0')}`;

	async function save() {
		busy = true;
		const saved = await saveSettings({
			resetMinutes: inDay + (pm ? HALF_DAY : 0),
			dailyBonus: bonus
		});
		busy = false;
		failed = !saved;
		if (saved) await goto('/grown-up/settings');
	}
</script>

<svelte:head>
	<title>Rocket Rewards: Daily reset and bonus</title>
</svelte:head>

<BackHeader href="/grown-up/settings" label="Settings" />
<h1 class="m-0 font-heading text-[30px] leading-[1.05] font-normal">Daily reset and bonus</h1>
<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">
	Each morning, finished stops come back for the new day and rockets start a fresh trip.
</p>

{#if loaded}
	<div class="flex items-center justify-center gap-2.5 rounded-[22px] bg-card p-5">
		<select
			aria-label="Reset time"
			bind:value={inDay}
			class="min-h-11 appearance-none bg-card text-right font-heading text-[56px] leading-none text-ink"
		>
			{#each TIMES as m (m)}
				<option value={m} class="text-[18px]">{clock(m)}</option>
			{/each}
		</select>
		<div class="flex flex-col gap-1.5" role="group" aria-label="Morning or afternoon">
			{#each [false, true] as isPm (isPm)}
				<button
					type="button"
					aria-pressed={pm === isPm}
					onclick={() => (pm = isPm)}
					class={[
						'flex min-h-11 items-center rounded-xl px-3.5 font-black',
						pm === isPm ? 'bg-hi text-ink-on-orange' : 'bg-label text-muted'
					]}>{isPm ? 'pm' : 'am'}</button
				>
			{/each}
		</div>
	</div>
	<Stepper
		label="Daily bonus"
		hint="For finishing every stop"
		bind:value={bonus}
		min={BONUS_LIMITS.min}
		max={BONUS_LIMITS.max}
		step={BONUS_LIMITS.step}
		less="Less"
		more="More"
	/>
	<p class="m-0 text-[16px] leading-[1.45] font-bold text-muted">Skipped or hidden chores don’t stop a child earning the bonus for the rest.</p>
	{#if failed}<p role="alert" class="m-0 text-[16px] font-black text-amber">{SAVE_FAILED}</p>{/if}
	<button type="button" disabled={busy} onclick={save} class="flex min-h-14 items-center justify-center gap-2 rounded-[20px] bg-hi font-heading text-[19px] text-ink-on-orange shadow-[0_5px_0_#8c5731]">Save</button>
{/if}
