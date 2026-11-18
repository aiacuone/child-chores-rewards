// The grown-up pages' calls for Settings, Children.
import type { ColourId } from './colours';
import { grownupFetch } from './grownup.svelte';
import { SAVE_FAILED } from './chores';
import type { PictureId } from './passcode';
import type { RankName } from './ranks';

export type ChildRow = {
	id: number;
	name: string;
	colour: string;
	rank: RankName;
	stars: number;
	passcode: boolean;
	photo: string | null;
};
export type ChildDetail = ChildRow & {
	colourId: ColourId;
	takenColours: ColourId[];
	canRemove: boolean;
};

const JSON_HEADERS = { 'content-type': 'application/json' };

/** The child, or null when there is no such child in this family. */
export async function fetchChild(id: string | undefined) {
	const res = await grownupFetch(`/api/grown-up/children/${id}`);
	return res.ok ? ((await res.json()) as ChildDetail) : null;
}

/** The server's message for a refused change, or null when it worked. */
async function problem(res: Response) {
	if (res.ok) return null;
	const body = (await res.json().catch(() => null)) as { message?: string } | null;
	return body?.message ?? SAVE_FAILED;
}

export async function saveChild(id: number | null, child: { name: string; colour: ColourId }) {
	const res = await grownupFetch(`/api/grown-up/children${id ? `/${id}` : ''}`, {
		method: id ? 'PUT' : 'POST',
		headers: JSON_HEADERS,
		body: JSON.stringify(child)
	});
	return problem(res);
}

export async function removeChild(id: number) {
	return problem(await grownupFetch(`/api/grown-up/children/${id}`, { method: 'DELETE' }));
}

export async function savePasscode(id: number, pictures: PictureId[]) {
	const res = await grownupFetch(`/api/grown-up/children/${id}/passcode`, {
		method: 'PUT',
		headers: JSON_HEADERS,
		body: JSON.stringify({ pictures })
	});
	return problem(res);
}

export async function turnOffPasscode(id: number) {
	return problem(await grownupFetch(`/api/grown-up/children/${id}/passcode`, { method: 'DELETE' }));
}

export async function removeChildPhoto(id: number) {
	return problem(await grownupFetch(`/api/grown-up/children/${id}/photo`, { method: 'DELETE' }));
}
