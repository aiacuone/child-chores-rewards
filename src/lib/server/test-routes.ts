// Test-only pages under /test/: a sign-in that skips Google, for Playwright,
// and component previews. They exist only when TEST_ROUTES=1 AND the request
// is for localhost, so the live site (rocket-rewards.duckdns.org, which never
// sets TEST_ROUTES) refuses them twice over.
import { TEST_ROUTES } from '$app/env/private';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function testRoutesAllowed(url: URL, enabled: boolean = TEST_ROUTES) {
	return enabled === true && LOCAL_HOSTS.has(url.hostname);
}
