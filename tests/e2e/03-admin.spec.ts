/**
 * @file E2E tests for the admin surface as the seeded demo admin.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers/auth";

test.describe("/admin/* (demo admin)", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await loginAs(context, baseURL!, "demo-admin-user");
  });

  test("overview shows KPI tiles", async ({ page }) => {
    await page.goto("/admin/overview");
    await expect(page.getByRole("heading", { name: /Overview/i })).toBeVisible();
    await expect(page.getByText(/Publishers/i).first()).toBeVisible();
  });

  test("publishers admin page lists publishers", async ({ page }) => {
    await page.goto("/admin/publishers");
    await expect(page.getByRole("heading", { name: /Publishers/i })).toBeVisible();
  });

  test("moderation queue is reachable", async ({ page }) => {
    await page.goto("/admin/moderation");
    await expect(page.getByRole("heading", { name: /Moderation/i })).toBeVisible();
  });
});
