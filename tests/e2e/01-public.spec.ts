/**
 * @file E2E smoke tests for anonymous public browsing.
 */

import { test, expect } from "@playwright/test";

test.describe("public browsing", () => {
  test("home page lists posts and the top nav", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "DevFeed" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    const postLinks = page.locator('a[href^="/out/"]');
    await expect(postLinks.first()).toBeVisible();
    expect(await postLinks.count()).toBeGreaterThan(5);
  });

  test("can navigate to publishers index and a publisher detail page", async ({ page }) => {
    await page.goto("/publishers");
    await expect(page.getByRole("heading", { name: /Publishers/i })).toBeVisible();
    await page.getByRole("link", { name: /^Stripe Engineering$/ }).first().click();
    await expect(page).toHaveURL(/\/publishers\/[a-z0-9-]+/);
    await expect(page.getByRole("heading", { name: /Stripe/ }).first()).toBeVisible();
  });

  test("search page accepts a query", async ({ page }) => {
    await page.goto("/search?q=react");
    await expect(page.getByRole("heading", { name: /Search/i })).toBeVisible();
  });

  test("admin pages are hidden from anonymous users (404)", async ({ page }) => {
    const res = await page.goto("/admin/overview");
    expect(res?.status()).toBe(404);
  });

  test("account pages redirect anonymous users to /login", async ({ page }) => {
    await page.goto("/me/account");
    await expect(page).toHaveURL(/\/login/);
  });
});
