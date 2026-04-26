/**
 * @file E2E smoke for the admin "Test feed" controls.
 *
 * The fetch happens server-side (inside the Server Action) so we can't
 * intercept it from the page; instead we drive the UI with URLs that
 * deterministically resolve through the SSRF guard so the assertions
 * stay self-contained:
 *  - `http://127.0.0.1/feed` → SSRF block, "Test failed" panel.
 *  - `not-a-url`             → schema rejection, inline error message.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers/auth";

test.describe("/admin/sources Test feed flow", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await loginAs(context, baseURL!, "demo-admin-user");
  });

  test("Test connection on the Add-source form surfaces the SSRF guard error", async ({ page }) => {
    await page.goto("/admin/sources");
    await page.fill("#feedUrl", "http://127.0.0.1/feed");
    await page.getByRole("button", { name: "Test connection" }).click();

    const status = page.getByRole("status").first();
    await expect(status).toBeVisible({ timeout: 15_000 });
    await expect(status).toContainText(/Test failed/i);
    await expect(status).toContainText(/SSRF/i);
  });

  test("Per-row Test panel renders a result region for the stored URL", async ({ page }) => {
    await page.goto("/admin/sources");
    const firstRow = page.locator("ul > li").first();

    // Open the Test drawer for this row.
    await firstRow.getByRole("button", { name: "Test", exact: true }).click();
    await expect(firstRow.getByRole("button", { name: "Close test" })).toBeVisible();

    // The drawer's submit button is the only "Test" button now.
    await firstRow.getByRole("button", { name: "Test", exact: true }).click();

    const status = firstRow.getByRole("status");
    await expect(status).toBeVisible({ timeout: 30_000 });
  });
});
