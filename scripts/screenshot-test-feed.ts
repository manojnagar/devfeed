/**
 * @file Capture screenshots of the new admin "Test feed" controls.
 * Run via `npx tsx scripts/screenshot-test-feed.ts` while the dev
 * server is up on :3000. Outputs into `screenshots/`.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const COOKIE_NAME = "df_stub_session";
const OUT_DIR = "screenshots";

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: encodeURIComponent(
        JSON.stringify({
          userId: "demo-admin-user",
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        }),
      ),
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  await page.goto("http://localhost:3000/admin/sources");
  await page.waitForSelector("text=Add a feed source");

  await page.fill("#feedUrl", "http://127.0.0.1/feed");
  await page.getByRole("button", { name: "Test connection" }).click();
  await page.waitForSelector("text=Test failed", { timeout: 15_000 });
  await page.screenshot({
    path: `${OUT_DIR}/admin-sources-test-add-form.png`,
    fullPage: true,
  });

  // Per-row Test drawer
  const firstRow = page.locator("ul > li").first();
  await firstRow.getByRole("button", { name: "Test", exact: true }).click();
  await page.waitForSelector("text=Close test");
  await firstRow.getByRole("button", { name: "Test", exact: true }).click();
  await page.waitForSelector('[role="status"]', { timeout: 15_000 });
  await page.screenshot({
    path: `${OUT_DIR}/admin-sources-test-row-result.png`,
    fullPage: true,
  });

  await browser.close();
  console.log(`saved screenshots to ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
