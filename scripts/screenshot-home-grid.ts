/**
 * @file Capture screenshots of the home feed at multiple breakpoints
 * to verify the 2-column layout. Run via:
 *   npx tsx scripts/screenshot-home-grid.ts
 * while the dev server is up on :3000.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT_DIR = "screenshots";

interface Sample {
  name: string;
  width: number;
  height: number;
}

const SAMPLES: Sample[] = [
  { name: "home-mobile-375", width: 375, height: 900 },
  { name: "home-md-900", width: 900, height: 900 },
  { name: "home-lg-1280", width: 1280, height: 900 },
  { name: "home-xl-1536", width: 1536, height: 900 },
];

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  for (const sample of SAMPLES) {
    const context = await browser.newContext({
      viewport: { width: sample.width, height: sample.height },
    });
    const page = await context.newPage();
    await page.goto("http://localhost:3000/");
    await page.waitForSelector("text=Latest engineering posts", { timeout: 15_000 });
    await page.screenshot({
      path: `${OUT_DIR}/${sample.name}.png`,
      fullPage: false,
    });
    await context.close();
    console.log(`captured ${sample.name}`);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
