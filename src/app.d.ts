import type { SignedInUser } from '#lib/server/auth.ts';

declare global {
	namespace App {
		interface Locals {
			user: SignedInUser | null;
		}
	}
}

export {};
