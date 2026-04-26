/**
 * @file URL parsing + canonicalization.
 *
 * Used by the ingestion pipeline to dedupe posts (two URLs that differ
 * only in tracking parameters or fragments must hash to the same
 * canonical form) and by the public out-link route to verify that
 * outbound destinations look legitimate before redirecting.
 */

const TRACKING_PARAM_PATTERNS: RegExp[] = [
  /^utm_/i,
  /^gclid$/i,
  /^fbclid$/i,
  /^mc_(eid|cid)$/i,
  /^ref$/i,
  /^referrer$/i,
  /^source$/i,
];

/**
 * Reduce a URL to a canonical form for deduplication.
 *
 *   - lowercases the host
 *   - removes default ports
 *   - strips tracking parameters and the fragment
 *   - sorts remaining query parameters alphabetically
 *   - removes a trailing slash on non-root paths
 *
 * Returns the original input if parsing fails.
 */
export function canonicalizeUrl(input: string): string {
  try {
    const u = new URL(input);
    u.hostname = u.hostname.toLowerCase();
    if (
      (u.protocol === "http:" && u.port === "80") ||
      (u.protocol === "https:" && u.port === "443")
    ) {
      u.port = "";
    }
    u.hash = "";
    const params = new URLSearchParams(u.search);
    const cleaned = new URLSearchParams();
    const sortedKeys = Array.from(params.keys()).sort();
    for (const key of sortedKeys) {
      if (TRACKING_PARAM_PATTERNS.some((rx) => rx.test(key))) continue;
      const values = params.getAll(key);
      for (const v of values) cleaned.append(key, v);
    }
    u.search = cleaned.toString();
    let out = u.toString();
    if (out.endsWith("/") && u.pathname !== "/") out = out.slice(0, -1);
    return out;
  } catch {
    return input;
  }
}

/** Returns the eTLD+1 of a hostname (best-effort, no PSL lookup). */
export function rootDomain(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

/** True when the URL points at a private / loopback / link-local host. */
export function isPrivateHost(hostname: string): boolean {
  if (hostname === "localhost") return true;
  if (/^127\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true;
  if (/^::1$/.test(hostname)) return true;
  if (/^fe80:/i.test(hostname)) return true;
  if (/^fc[0-9a-f]{2}:/i.test(hostname)) return true;
  return false;
}
