// The grown-up pages' calls for Settings.
import { grownupFetch, useSettings } from './grownup.svelte';
import type { Settings } from './settings';

export type SettingsView = {
	settings: Settings;
	signedInAs: string;
	recovery: string | null;
	topic: string;
	children: string[];
	grownUps: number;
};

export async function fetchSettings() {
	const res = await grownupFetch('/api/grown-up/settings');
	return res.ok ? ((await res.json()) as SettingsView) : null;
}

/** Save some settings. Null when they did not save. */
export async function saveSettings(changes: Partial<Settings>) {
	const res = await grownupFetch('/api/grown-up/settings', {
		method: 'PUT',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(changes)
	});
	if (!res.ok) return null;
	const { settings } = (await res.json()) as { settings: Settings };
	useSettings(settings);
	return settings;
}
