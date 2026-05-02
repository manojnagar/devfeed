/**
 * @file E2E smoke for the inline article reader at /posts/[postId].
 *
 * The seed fixtures ship without `<content:encoded>`, so a fresh
 * preview triggers on-demand extraction. Real outbound fetches won't
 * complete in CI, so we verify the page-level resilience: header
 * renders, footer renders, the outbound link points at /out/[postId],
 * and the body region eventually shows EITHER an extracted body OR
 * the friendly fallback panel (we just need a visible terminal state).
 */

import { test, expect } from "@playwright/test";

test.describe("/posts/[postId] inline reader", () => {
  test("opens the reader page from the home feed", async ({ page }) => {
    await page.goto("/");
    const firstCard = page.locator('a[aria-label^="Preview:"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page).toHaveURL(/\/posts\//);
  });

  test("post page shows header, footer CTA, and body or fallback", async ({ page }) => {
    await page.goto("/");
    const firstCard = page.locator('a[aria-label^="Preview:"]').first();
    await firstCard.click();

    // Page chrome — these come from the synchronous header.
    await expect(page.getByRole("link", { name: /Back to feed/i })).toBeVisible();

    // Body region — either the article-body div renders, or the
    // fallback panel renders. Either way the reader has terminated.
    const bodyOrFallback = page
      .locator(".article-body")
      .or(page.getByText(/We couldn't generate an inline preview/i))
      .first();
    await expect(bodyOrFallback).toBeVisible({ timeout: 30_000 });

    // The single, prominent outbound CTA at the bottom of the page.
    // We assert there is exactly ONE so we don't regress to a multi-CTA
    // layout that lets users accidentally open duplicate tabs.
    const cta = page.getByTestId("open-original-cta");
    await expect(cta).toHaveCount(1);
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href).toMatch(/^\/out\//);
    expect(await cta.getAttribute("target")).toBe("_blank");
    expect(await cta.getAttribute("rel")).toContain("noopener");
  });
});
