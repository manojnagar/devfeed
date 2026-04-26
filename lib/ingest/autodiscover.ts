/**
 * @file Feed autodiscovery — finds the RSS / Atom URL on a homepage.
 *
 * Used by the /suggest form. Looks for `<link rel="alternate" type="…">`
 * tags first, then falls back to common feed paths (/feed, /rss.xml,
 * /atom.xml, /index.xml).
 */

import { safeFetch } from "./safe-fetch";

export interface AutodiscoverResult {
  feedUrl: string | null;
  source: "link-tag" | "common-path" | null;
  status: number | null;
}

const COMMON_PATHS = ["/feed", "/feed/", "/rss.xml", "/atom.xml", "/index.xml", "/feed.xml"];
const LINK_RX =
  /<link\s+[^>]*?rel=["']alternate["'][^>]*?type=["'](application\/(?:rss|atom)\+xml)["'][^>]*?href=["']([^"']+)["'][^>]*?>/gi;

function resolveUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function extractFeedFromHtml(html: string, baseUrl: string): string | null {
  LINK_RX.lastIndex = 0;
  for (const match of html.matchAll(LINK_RX)) {
    const resolved = resolveUrl(baseUrl, match[2]);
    if (resolved) return resolved;
  }
  return null;
}

/**
 * Discover the feed URL for a website.
 *
 * Returns `feedUrl: null` if neither the link-tag nor common-path
 * fallback turned up anything. The HTTP status of the homepage is
 * always returned so the caller can surface useful errors.
 */
export async function autodiscoverFeed(websiteUrl: string): Promise<AutodiscoverResult> {
  let homepage: Awaited<ReturnType<typeof safeFetch>>;
  try {
    homepage = await safeFetch(websiteUrl);
  } catch {
    return { feedUrl: null, source: null, status: null };
  }
  const linkTag = extractFeedFromHtml(homepage.body, homepage.finalUrl);
  if (linkTag) return { feedUrl: linkTag, source: "link-tag", status: homepage.status };

  const base = new URL(websiteUrl);
  for (const path of COMMON_PATHS) {
    const candidate = new URL(path, base).toString();
    try {
      const head = await safeFetch(candidate, { method: "HEAD", timeoutMs: 5000 });
      if (head.status >= 200 && head.status < 400) {
        return { feedUrl: candidate, source: "common-path", status: head.status };
      }
    } catch {
      continue;
    }
  }
  return { feedUrl: null, source: null, status: homepage.status };
}
