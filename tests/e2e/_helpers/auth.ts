/**
 * @file Helpers to inject the stub session cookie in Playwright tests.
 *
 * Avoids exercising the real magic-link flow on every test (the stub
 * adapter just stores `{userId, expiresAt}` JSON in a cookie, so we can
 * craft it directly).
 */

import type { BrowserContext } from "@playwright/test";

const COOKIE_NAME = "df_stub_session";

function buildCookieValue(userId: string): string {
  return JSON.stringify({
    userId,
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  });
}

/** Attach a stub session cookie scoped to the test base URL. */
export async function loginAs(
  context: BrowserContext,
  baseURL: string,
  userId: "demo-user" | "demo-admin-user",
): Promise<void> {
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: encodeURIComponent(buildCookieValue(userId)),
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 7 * 86_400,
    },
  ]);
}
