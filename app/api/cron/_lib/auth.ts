/**
 * @file Helper for authenticating cron requests.
 *
 * Vercel Cron sends a `Authorization: Bearer <CRON_SECRET>` header.
 * This helper compares it to the env-stored secret in constant time.
 * Returns `true` when the request is authorized, `false` otherwise.
 */

import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

/** Verify the cron auth header against the configured secret. */
export function isAuthorizedCron(request: Request): boolean {
  const env = getEnv();
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (header.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}
