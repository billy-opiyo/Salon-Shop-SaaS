import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: "list",
	use: {
		baseURL: "http://localhost:3100",
		trace: "on-first-retry",
	},
	webServer: {
		command:
			'cmd /c "set AUTH_SECRET=playwright-test-secret&& node node_modules/next/dist/bin/next dev frontend -p 3100"',
		url: "http://localhost:3100",
		reuseExistingServer: false,
		timeout: 120_000,
	},
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "mobile", use: { ...devices["Pixel 5"], browserName: "chromium" } },
	],
})
