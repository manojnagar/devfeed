/**
 * @file On-demand article extraction.
 *
 * Used by `/posts/[postId]` when a post's body wasn't supplied by its
 * RSS/Atom feed. Pipeline:
 *
 *   safeFetch(url)            // SSRF + size + time guards
 *     -> parseHTML(body)      // linkedom (lighter than jsdom)
 *     -> new Readability(doc) // Mozilla's reader-mode extractor
 *     -> sanitizePostBody     // shared allow-list (same as feed path)
 *
 * Always resolves with a typed `ExtractResult` — never throws — so the
 * caller (the page) can render a graceful fallback when extraction
 * fails. Errors are tagged so `body_failed_reason` is short and
 * actionable in audit/log views.
 *
 * Rate limiting is enforced at the call site, not here, because the
 * key (per-IP / per-user) lives outside this pure helper.
 */

import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { safeFetch, UnsafeUrlError } from "./safe-fetch";
import { sanitizePostBody } from "./sanitize-body";

export interface ExtractSuccess {
  ok: true;
  bodyHtml: string;
  byline: string | null;
  excerpt: string | null;
}

export interface ExtractFailure {
  ok: false;
  reason: string;
}

export type ExtractResult = ExtractSuccess | ExtractFailure;

const MIN_BODY_CHARS = 200;

function classify(err: unknown): string {
  if (err instanceof UnsafeUrlError) return `ssrf_${err.reason}`;
  if (err instanceof Error) {
    if (err.name === "AbortError") return "timeout";
    return err.message.slice(0, 200);
  }
  return String(err).slice(0, 200);
}

/**
 * Fetch `url`, run Readability, sanitize, and return the cleaned body.
 *
 * Failure cases (each caches `body_failed_at` so the page short-circuits
 * the next attempt for ~24h):
 *   - SSRF or unreachable URL.
 *   - Upstream returned >= 400.
 *   - DOM parse error.
 *   - Readability returned no content (paywall walls, JS-only pages).
 *   - Sanitized output collapsed to under `MIN_BODY_CHARS` (almost
 *     always means the source page was an empty shell).
 */
export async function extractArticle(url: string): Promise<ExtractResult> {
  let fetched;
  try {
    fetched = await safeFetch(url);
  } catch (err) {
    return { ok: false, reason: classify(err) };
  }

  if (fetched.status >= 400) {
    return { ok: false, reason: `http_${fetched.status}` };
  }
  if (!fetched.body) {
    return { ok: false, reason: "empty_response" };
  }

  let document;
  try {
    document = parseHTML(fetched.body).document;
  } catch (err) {
    return { ok: false, reason: `parse_${classify(err)}` };
  }

  let parsed;
  try {
    parsed = new Readability(document, {
      charThreshold: 200,
    }).parse();
  } catch (err) {
    return { ok: false, reason: `readability_${classify(err)}` };
  }

  if (!parsed?.content) {
    return { ok: false, reason: "no_article_content" };
  }

  const bodyHtml = sanitizePostBody(parsed.content);
  if (bodyHtml.length < MIN_BODY_CHARS) {
    return { ok: false, reason: "body_too_short" };
  }

  return {
    ok: true,
    bodyHtml,
    byline: parsed.byline ?? null,
    excerpt: parsed.excerpt ?? null,
  };
}
