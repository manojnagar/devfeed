/**
 * @file Playwright e2e configuration.
 *
 * Boots the Next.js dev server on port 3100 (separate from the regular
 * dev port 3000 to avoid collisions with a watch-mode session) and runs
 * specs from `tests/e2e/` against it. Tests rely on the in-memory
 * storage + stub auth adapters so they need zero external services.
 */

import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      STORAGE_ADAPTER: "memory",
      AUTH_ADAPTER: "stub",
      EMAIL_ADAPTER: "console",
      NEXT_PUBLIC_SITE_URL: baseURL,
      CRON_SECRET: "test-cron-secret",
      UNSUBSCRIBE_SECRET: "test-unsubscribe-secret",
    },
  },
});
