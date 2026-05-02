/**
 * @file Capture the new inline-reader post preview at a few states.
 * Seeded posts use real publisher domains with synthetic slugs, so
 * extraction will most likely return 4xx and we'll capture both the
 * new page chrome AND the fallback panel.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT_DIR = "screenshots";

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1400 },
  });
  const page = await context.newPage();

  // 1. Home page — proves the 2-column feed still renders correctly.
  await page.goto("http://localhost:3000/");
  const firstCard = page.locator('a[aria-label^="Preview:"]').first();
  await firstCard.waitFor({ state: "visible", timeout: 15_000 });
  await page.screenshot({
    path: `${OUT_DIR}/post-page-home-2col.png`,
    fullPage: false,
  });

  // 2. Inline reader — happy path. The first seed template ships with
  //    a sample body so the reader path is deterministic.
  const post = await firstCard.getAttribute("href");
  await page.goto(`http://localhost:3000${post}`);
  await page.locator(".article-body").first().waitFor({
    state: "visible",
    timeout: 20_000,
  });
  await page.screenshot({
    path: `${OUT_DIR}/post-page-inline-reader.png`,
    fullPage: true,
  });

  // 3. Fallback panel — walk the first ~10 cards looking for one whose
  //    post page renders the fallback (synthetic URL → 404 → friendly
  //    panel). Only template index 0 ships a sample body in the seed,
  //    so any post built from a different template exercises this
  //    branch.
  await page.goto("http://localhost:3000/");
  const allCards = page.locator('a[aria-label^="Preview:"]');
  await allCards.first().waitFor({ state: "visible", timeout: 15_000 });
  const total = await allCards.count();
  for (let i = 0; i < Math.min(total, 10); i += 1) {
    const href = await allCards.nth(i).getAttribute("href");
    if (!href) continue;
    await page.goto(`http://localhost:3000${href}`);
    const fallback = page.getByText(/We couldn't generate an inline preview/i);
    const visible = await fallback
      .first()
      .isVisible({ timeout: 25_000 })
      .catch(() => false);
    if (visible) {
      await page.screenshot({
        path: `${OUT_DIR}/post-page-fallback.png`,
        fullPage: true,
      });
      break;
    }
    await page.goto("http://localhost:3000/");
    await allCards.first().waitFor({ state: "visible", timeout: 15_000 });
  }

  await browser.close();
  console.log(`saved screenshots to ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
