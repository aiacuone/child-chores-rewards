// Grown-up pages run only in the browser: the grown-up token lives in page
// memory (src/lib/grownup.svelte.ts), so the server never renders them unlocked.
export const ssr = false;
