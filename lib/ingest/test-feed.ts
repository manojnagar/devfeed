/**
 * @file Dry-run feed test — fetch + parse + summarize, without writing.
 *
 * Used by the admin "Test feed" button on /admin/sources to validate
 * that a candidate (or existing) RSS / Atom URL responds, parses, and
 * exposes recognizable items, BEFORE the cron ingest pipeline picks it
 * up. Nothing about the request is persisted to the catalog —
 * `runIngest()` is the only entry point that writes posts.
 *
 * Returns a structured `TestFeedResult` so the UI can render specific
 * checks (HTTP status, content type, item count, sample titles) and an
 * actionable failure reason when something goes wrong.
 *
 * Security:
 *  - Network access uses `safeFetch` (SSRF allow-list, time + size caps).
 *  - Sample titles are truncated to keep the payload bounded.
 *  - The action layer wraps this with `requireAdmin()` + per-admin rate
 *    limits to prevent the endpoint becoming an abuse vector.
 */

import { parseFeed } from "./parse-feed";
import { safeFetch, UnsafeUrlError } from "./safe-fetch";

const SAMPLE_LIMIT = 5;
const TITLE_PREVIEW_CHARS = 140;

export interface TestFeedSampleItem {
  title: string;
  link: string;
  publishedAt: string;
}

export interface TestFeedResult {
  ok: boolean;
  feedUrl: string;
  status: number | null;
  finalUrl: string | null;
  contentType: string | null;
  durationMs: number;
  itemCount: number;
  isAtom: boolean | null;
  channelTitle: string | null;
  sampleItems: TestFeedSampleItem[];
  warnings: string[];
  error: string | null;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

function classifyError(err: unknown): string {
  if (err instanceof UnsafeUrlError) {
    return `Blocked by SSRF guard (${err.reason}): ${err.message}`;
  }
  if (err instanceof Error) {
    if (err.name === "AbortError") return "Request timed out before the feed responded.";
    return err.message;
  }
  return String(err);
}

/**
 * Fetch the URL once and run it through the same parser the cron uses.
 *
 * Always resolves with a `TestFeedResult`. Network or SSRF errors set
 * `ok=false` and `error` to a human-readable string — the caller renders
 * that inline; nothing escapes as a thrown error so the action can stay
 * a clean `useActionState` returning function.
 */
export async function testFeed(feedUrl: string): Promise<TestFeedResult> {
  const startedAt = Date.now();
  const baseResult: TestFeedResult = {
    ok: false,
    feedUrl,
    status: null,
    finalUrl: null,
    contentType: null,
    durationMs: 0,
    itemCount: 0,
    isAtom: null,
    channelTitle: null,
    sampleItems: [],
    warnings: [],
    error: null,
  };

  try {
    const fetched = await safeFetch(feedUrl);
    const durationMs = Date.now() - startedAt;
    const contentType = fetched.headers.get("content-type");
    const status = fetched.status;
    const warnings: string[] = [];

    if (status >= 400) {
      return {
        ...baseResult,
        status,
        finalUrl: fetched.finalUrl,
        contentType,
        durationMs,
        error: `Upstream responded with HTTP ${status}.`,
      };
    }

    if (status >= 300) {
      warnings.push(`Followed redirect → ${fetched.finalUrl}`);
    }

    let parsed;
    try {
      parsed = parseFeed(fetched.body);
    } catch (parseErr) {
      return {
        ...baseResult,
        status,
        finalUrl: fetched.finalUrl,
        contentType,
        durationMs,
        warnings,
        error: `Could not parse the response as RSS/Atom: ${classifyError(parseErr)}`,
      };
    }

    if (parsed.items.length === 0) {
      warnings.push(
        "Parsed 0 items — the URL responded but didn't look like a recognizable RSS/Atom feed.",
      );
    }

    if (
      contentType &&
      !/(rss|atom|xml|html)/i.test(contentType)
    ) {
      warnings.push(`Unexpected content-type: ${contentType}`);
    }

    const sampleItems = parsed.items.slice(0, SAMPLE_LIMIT).map((item) => ({
      title: truncate(item.title, TITLE_PREVIEW_CHARS),
      link: item.link,
      publishedAt: item.publishedAt,
    }));

    return {
      ok: parsed.items.length > 0,
      feedUrl,
      status,
      finalUrl: fetched.finalUrl,
      contentType,
      durationMs,
      itemCount: parsed.items.length,
      isAtom: parsed.isAtom,
      channelTitle: parsed.channelTitle,
      sampleItems,
      warnings,
      error: null,
    };
  } catch (err) {
    return {
      ...baseResult,
      durationMs: Date.now() - startedAt,
      error: classifyError(err),
    };
  }
}
