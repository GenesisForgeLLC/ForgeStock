import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the ForgeStock critical-path smoke test.
 * Requires a running app with a live Supabase backend and these env vars:
 *   E2E_BASE_URL (default http://localhost:3000)
 *   E2E_EMAIL, E2E_PASSWORD (a seeded test account)
 * The dev server is started automatically unless E2E_BASE_URL is external.
 */
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["iPhone 13"], // mobile-first: exercise the phone viewport
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
      },
});
