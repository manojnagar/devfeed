/**
 * @file E2E tests for the authenticated /me/* surface.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers/auth";

test.describe("/me/* (demo user)", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await loginAs(context, baseURL!, "demo-user");
  });

  test("account page renders and exposes sign out", async ({ page }) => {
    await page.goto("/me/account");
    await expect(page.getByRole("heading", { name: /Account/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign out/i })).toBeVisible();
  });

  test("digest preferences page lets the user pick a frequency", async ({ page }) => {
    await page.goto("/me/digest");
    await expect(page.getByRole("heading", { name: /Digest/i })).toBeVisible();
    await expect(page.locator("select[name=\"frequency\"]")).toBeVisible();
  });

  test("bookmarks page is empty for a brand-new demo user", async ({ page }) => {
    await page.goto("/me/bookmarks");
    await expect(page.getByText(/no bookmarks yet/i)).toBeVisible();
  });

  test("admin pages remain hidden (404) for non-admins", async ({ page }) => {
    const res = await page.goto("/admin/overview");
    expect(res?.status()).toBe(404);
  });
});
