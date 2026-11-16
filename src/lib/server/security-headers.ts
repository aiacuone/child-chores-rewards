// Headers sent with every response the app makes (issue #15). The content
// security policy itself is in vite.config.ts, because SvelteKit adds a fresh
// nonce to it for each page.

export const SECURITY_HEADERS: Record<string, string> = {
	// Browsers use https for this site for a year, even if someone types http.
	'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
	// Use the declared type of a file; never guess it is a script or a page.
	'X-Content-Type-Options': 'nosniff',
	// No other site can show these pages in a frame (with frame-ancestors in the CSP).
	'X-Frame-Options': 'DENY',
	// Other sites see only the address of the site, never a page's path.
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	// A page opened from another site cannot reach back into this one.
	'Cross-Origin-Opener-Policy': 'same-origin'
};

/** Add the headers to a response, keeping any the route set itself. */
export function addSecurityHeaders(headers: Headers) {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		if (!headers.has(name)) headers.set(name, value);
	}
}
