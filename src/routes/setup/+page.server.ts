import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { step } = await parent();
	redirect(303, `/setup/${step}`);
};
