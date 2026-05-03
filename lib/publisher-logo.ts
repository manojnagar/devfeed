/**
 * @file Publisher logo URL resolver.
 *
 * Strategy
 * --------
 * Render sites pass an *ordered list* of candidate logo URLs to the
 * `Avatar` primitive, which walks the list — advancing on network
 * errors and on suspiciously small decoded images — until either a
 * candidate succeeds or the list is exhausted (in which case Avatar
 * falls back to colored initials).
 *
 * The resolver assembles candidates in this order:
 *
 *   1. `publisher.logoUrl` if set by the admin — final and authoritative.
 *      We do *not* mix in derived favicons for an admin override; if the
 *      operator typed a URL we trust them and fall through to initials
 *      on failure rather than silently rendering a different image.
 *
 *   2. The publisher's own host:
 *        - `/apple-touch-icon.png` (typically 180×180, modern sites)
 *        - `/apple-touch-icon-precomposed.png` (older variant)
 *        - `/favicon.ico` (legacy 16×16 / 32×32)
 *
 *   3. The apex domain (when the publisher URL is a 3+ label subdomain
 *      like `engineering.linkedin.com`): same three paths against the
 *      apex (`linkedin.com`). This rescues the very common pattern of
 *      engineering blogs hosted on a subdomain that doesn't serve its
 *      own icons.
 *
 * Platform-hosted blogs
 * ---------------------
 * For URLs hosted on multi-tenant platforms (Medium, Tumblr, Substack,
 * etc.) where the favicon is the *platform's* logo and not the
 * publisher's (e.g. `medium.com/airbnb-engineering` resolves to
 * Medium's green `M`, not Airbnb's), we deliberately return *no*
 * candidates. Showing every Medium-hosted publisher with the same icon
 * is more misleading than just showing colored initials — and the
 * admin can always override via `publisher.logoUrl` for those rows.
 *
 * Privacy
 * -------
 * All candidates are fetched directly from the publisher's own origin.
 * No third-party favicon CDN (Google, DuckDuckGo, Yandex) is involved,
 * so reader IPs and the set of feeds they're browsing are never leaked
 * to a third party. An earlier iteration used Google's `s2/favicons`
 * service and was retired because it returns a generic globe image
 * with HTTP 200 for unknown domains — fooling `<img onError>` and
 * sticking the grid full of placeholder globes.
 */

import type { Publisher } from "./types";

/**
 * Hosts that serve the *same* favicon for every account/page beneath
 * them. Returning their favicon as the publisher's logo is misleading
 * (e.g. every Medium-hosted blog would render with Medium's green M),
 * so for non-root paths under these hosts we return no candidates and
 * let the Avatar fall back to colored initials.
 *
 * Applied to both bare apex matches (`medium.com`) and one-level
 * subdomains (`username.medium.com`, `username.substack.com`).
 */
const PLATFORM_HOSTS: ReadonlySet<string> = new Set([
  "medium.com",
  "tumblr.com",
  "wordpress.com",
  "substack.com",
  "blogspot.com",
  "blogger.com",
  "dev.to",
  "hashnode.com",
  "hashnode.dev",
  "ghost.io",
  "hey.com",
]);

function platformApex(host: string): string | null {
  const lower = host.toLowerCase();
  if (PLATFORM_HOSTS.has(lower)) return lower;
  const labels = lower.split(".");
  if (labels.length >= 3) {
    const apex = labels.slice(-2).join(".");
    if (PLATFORM_HOSTS.has(apex)) return apex;
  }
  return null;
}

/**
 * Drop the leftmost label of a host *if* it has 3+ labels. Used to
 * derive an "apex" candidate origin for subdomain publishers like
 * `engineering.linkedin.com` → `linkedin.com`.
 *
 * This is a deliberately simple heuristic and *will* over-strip
 * unusual ccTLDs like `example.co.uk` (treating `co.uk` as the apex).
 * In practice the over-stripped variant just 404s and the chain
 * advances to the next candidate, so the worst case is a wasted
 * request, not a wrong logo.
 */
function dropLeftmostLabel(host: string): string | null {
  const labels = host.split(".");
  if (labels.length < 3) return null;
  return labels.slice(1).join(".");
}

const ICON_PATHS = [
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/favicon.ico",
] as const;

/**
 * Returns the ordered list of favicon candidate URLs to try for a
 * given website URL. Output is deterministic and safe to render —
 * malformed inputs and platform-hosted paths return `[]`.
 */
export function deriveFaviconCandidates(
  websiteUrl: string | null | undefined,
): string[] {
  if (!websiteUrl) return [];
  let url: URL;
  try {
    url = new URL(websiteUrl);
  } catch {
    return [];
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return [];

  // Multi-tenant platforms: only allow icons for the bare platform
  // root, never for sub-accounts (`medium.com/airbnb-engineering`,
  // `username.substack.com`, etc.).
  const platform = platformApex(url.host);
  if (platform) {
    const isBareRoot =
      url.host.toLowerCase() === platform &&
      (url.pathname === "" || url.pathname === "/");
    if (!isBareRoot) return [];
  }

  const candidates: string[] = [];
  const seen = new Set<string>();
  const push = (origin: string) => {
    for (const path of ICON_PATHS) {
      const u = `${origin}${path}`;
      if (!seen.has(u)) {
        seen.add(u);
        candidates.push(u);
      }
    }
  };

  push(`${url.protocol}//${url.host}`);

  const apexHost = dropLeftmostLabel(url.host);
  if (apexHost && !platformApex(apexHost)) {
    push(`${url.protocol}//${apexHost}`);
  }

  return candidates;
}

/**
 * Backward-compatible single-URL resolver. Returns the first favicon
 * candidate (the publisher-host `apple-touch-icon.png`) or `null`.
 * Prefer {@link deriveFaviconCandidates} in new code so the Avatar
 * can walk the chain.
 */
export function deriveFaviconUrl(
  websiteUrl: string | null | undefined,
): string | null {
  return deriveFaviconCandidates(websiteUrl)[0] ?? null;
}

/**
 * Returns the ordered list of logo URLs to attempt for a publisher.
 *
 *   1. `publisher.logoUrl` (admin override) — used *alone* when set.
 *   2. Otherwise, {@link deriveFaviconCandidates} on `websiteUrl`.
 *
 * The Avatar primitive walks the array on `onError` and on
 * suspiciously-small decoded images, falling back to colored initials
 * when every candidate has been exhausted.
 */
export function resolvePublisherLogoCandidates(
  publisher: Pick<Publisher, "logoUrl" | "websiteUrl">,
): string[] {
  const explicit = publisher.logoUrl?.trim();
  if (explicit) return [explicit];
  return deriveFaviconCandidates(publisher.websiteUrl);
}

/**
 * Backward-compatible single-URL resolver. Returns the first
 * candidate or `null`. New call sites should use
 * {@link resolvePublisherLogoCandidates}.
 */
export function resolvePublisherLogo(
  publisher: Pick<Publisher, "logoUrl" | "websiteUrl">,
): string | null {
  return resolvePublisherLogoCandidates(publisher)[0] ?? null;
}
