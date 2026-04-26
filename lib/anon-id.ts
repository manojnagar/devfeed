/**
 * @file First-party anonymous visitor ID.
 *
 * Sets a long-lived `df_anon` cookie on first visit so anonymous
 * read-events can still be counted as "one visitor" without storing any
 * PII. Reused by analytics aggregations and by the bookmark-gating
 * modal flow.
 */

import { cookies } from "next/headers";
import { genId } from "./ids";

const COOKIE_NAME = "df_anon";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Read the anon id from cookies, generating + setting one if missing.
 *
 * @returns The visitor's stable anon id.
 */
export async function getOrSetAnonId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const fresh = genId();
  jar.set(COOKIE_NAME, fresh, {
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return fresh;
}

export const ANON_COOKIE_NAME = COOKIE_NAME;
