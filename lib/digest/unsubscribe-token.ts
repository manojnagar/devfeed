/**
 * @file Signed unsubscribe token.
 *
 * Produces and verifies an HMAC-SHA256 token of the form `<userId>.<sig>`.
 * Long enough to resist guessing, short enough to fit in a query string.
 * No third-party JWT dependency needed.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "../env";

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(userId: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(userId).digest();
  return base64url(sig);
}

/** Build an unsubscribe token. */
export function createUnsubscribeToken(userId: string): string {
  const secret = getEnv().UNSUBSCRIBE_SECRET;
  return `${userId}.${sign(userId, secret)}`;
}

/**
 * Verify a token + return the userId, or null if the signature is bad.
 *
 * Constant-time comparison via `timingSafeEqual` to prevent timing
 * oracles, per workspace mcp-security-guidelines.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const userId = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  const expected = sign(userId, getEnv().UNSUBSCRIBE_SECRET);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? userId : null;
}
