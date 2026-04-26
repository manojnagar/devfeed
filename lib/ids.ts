/**
 * @file ID, slug, and short-hash helpers.
 *
 * `genId` produces a UUID v4 (cryptographically random where supported,
 * deterministic-fallback only in non-Node environments). `slugify`
 * normalises arbitrary text into a URL-safe slug. `shortHash` returns a
 * stable 8-char hex digest of any string for cache keys / dedupe.
 */

import { createHash, randomUUID } from "node:crypto";

/** Generate a UUID v4. Safe in both Node and the browser. */
export function genId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return randomUUID();
}

/**
 * Convert any text to a URL-safe slug.
 *
 * Removes diacritics, lowercases, replaces non-alphanumerics with
 * hyphens, and collapses repeated hyphens.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Stable 8-char hex digest of a string. Useful for short cache keys. */
export function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 8);
}

/**
 * Hash a value with a daily-rotating salt. Used for IP/UA hashing in
 * read events so we keep aggregate analytics without storing raw PII.
 */
export function hashWithDailySalt(value: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}
