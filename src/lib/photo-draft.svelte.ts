// The photo on a chore or reward form, before the form is saved: the photo can be
// chosen for a chore that does not exist yet, so it is uploaded after the save.
import { grownupFetch } from './grownup.svelte';

export class PhotoDraft {
	/** What the form shows: an address or a data URL. */
	preview = $state<string | null>(null);
	/** Which photo screen covers the form. */
	screen = $state<'choose' | 'remove' | null>(null);
	#blob: Blob | null = null;
	#remove = false;

	constructor(saved: string | null) {
		this.preview = saved;
	}

	async chosen(blob: Blob) {
		this.preview = await new Promise<string>((done, fail) => {
			const reader = new FileReader();
			reader.onload = () => done(String(reader.result));
			reader.onerror = () => fail(reader.error);
			reader.readAsDataURL(blob);
		});
		this.#blob = blob;
		this.#remove = false;
		this.screen = null;
	}

	removed() {
		this.preview = null;
		this.#blob = null;
		this.#remove = true;
		this.screen = null;
	}

	/** Send the change for a saved chore or reward. False when it did not work. */
	async apply(kind: 'chore' | 'reward', id: number) {
		const url = `/api/grown-up/photos/${kind}/${id}`;
		if (this.#blob) {
			const res = await grownupFetch(url, {
				method: 'PUT',
				headers: { 'content-type': 'image/jpeg' },
				body: this.#blob
			});
			if (res.ok) this.#blob = null;
			return res.ok;
		}
		if (!this.#remove) return true;
		const res = await grownupFetch(url, { method: 'DELETE' });
		if (res.ok) this.#remove = false;
		return res.ok;
	}
}
