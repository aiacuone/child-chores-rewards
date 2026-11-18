import { defineConfig, devices } from '@playwright/test';

// Runs against the production build (`node build`), started twice:
// - port 4173 with TEST_ROUTES=1, for the tests,
// - port 4174 without it, like the live site, to prove the test pages are refused.
// Each run starts from an empty database in data/ (git-ignored).
const server = (port: number, extra: string) => ({
	command: `rm -f data/e2e-${port}.db* && ${extra} PORT=${port} HOST=127.0.0.1 ORIGIN=http://localhost:${port} DATABASE_FILE=data/e2e-${port}.db node --require ./e2e/long-keep-alive.cjs build`,
	url: `http://localhost:${port}/login`,
	reuseExistingServer: false,
	timeout: 30_000
});

export default defineConfig({
	testDir: 'e2e',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: 'http://localhost:4173',
		...devices['Desktop Chrome'],
		viewport: { width: 390, height: 844 }
	},
	webServer: [server(4173, 'TEST_ROUTES=1'), server(4174, '')]
});
