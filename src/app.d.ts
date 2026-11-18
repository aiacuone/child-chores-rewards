import type { SignedInUser } from '#lib/server/auth.ts';

declare global {
	namespace App {
		interface Locals {
			user: SignedInUser | null;
			/** The hashed id of this device's session, or null when signed out. */
			sessionId: string | null;
		}
		interface PageState {
			/** The child just removed, for "Leo was removed" on Children. */
			removed?: string;
		}
	}
}

export {};
