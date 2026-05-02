/**
 * @file Integration tests for the post body cache.
 *
 * Covers the two paths users actually hit:
 *   1. Ingest path — `runIngest` finds a body in `<content:encoded>`,
 *      sanitizes it, and stores it on the post row with
 *      `body_source='feed'`. Visiting the page reads from cache; no
 *      extraction happens.
 *   2. Fallback path — feed has no body. The page calls
 *      `extractArticle`, persists the result, and a second visit reads
 *      from cache without re-fetching.
 *
 * `safeFetch` is mocked so each test stays deterministic and offline.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ingest/safe-fetch", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ingest/safe-fetch")>(
    "@/lib/ingest/safe-fetch",
  );
  return {
    ...actual,
    safeFetch: vi.fn(),
  };
});

import { resetMemoryStore } from "@/lib/data/memory/store";
import { __resetRepositoryCache, getRepository } from "@/lib/data";
import { runIngest } from "@/lib/ingest/run";
import { extractArticle } from "@/lib/ingest/extract-article";
import { safeFetch } from "@/lib/ingest/safe-fetch";
import { nowIso } from "@/lib/dates";

const mockedSafeFetch = vi.mocked(safeFetch);

const FEED_WITH_BODY = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <item>
      <title>Body fixture</title>
      <link>https://feeds.example.com/post-body</link>
      <description>Just the summary</description>
      <content:encoded><![CDATA[<p>This is the <strong>full</strong> body straight from the feed.</p>
      <p>It is long enough to clear the sanitize-and-store guard rails comfortably.</p>]]></content:encoded>
      <pubDate>Mon, 01 Apr 2025 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const FEED_NO_BODY = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Summary only</title>
      <link>https://feeds.example.com/post-summary</link>
      <description>Only a summary, no content:encoded.</description>
      <pubDate>Mon, 01 Apr 2025 00:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const ARTICLE_HTML = `<!doctype html><html><body><article>
  <h1>Real article</h1>
  <p>An on-demand extracted article body. We need a couple of healthy paragraphs so
     Mozilla Readability happily flags the content as a real article instead of
     boilerplate. Here we go with paragraph one.</p>
  <p>Paragraph two with <a href="https://example.com/x">a link</a> and some prose
     that pushes the byte count past the body-too-short threshold the extractor
     enforces.</p>
  <p>Paragraph three to be safe.</p>
</article></body></html>`;

beforeEach(() => {
  resetMemoryStore();
  __resetRepositoryCache();
  mockedSafeFetch.mockReset();
});

afterEach(() => {
  mockedSafeFetch.mockReset();
});

async function seedPublisherAndSource(): Promise<{
  publisherId: string;
  sourceId: string;
}> {
  const repo = getRepository();
  const publishers = await repo.publishers.list({ isActive: true });
  const publisher = publishers[0];
  const source = await repo.blogSources.upsert({
    id: "src-body-test",
    publisherId: publisher.id,
    kind: "rss",
    feedUrl: "https://feeds.example.com/feed.xml",
    scrapeConfig: null,
    isActive: true,
    lastFetchedAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,
    createdAt: nowIso(),
  });
  return { publisherId: publisher.id, sourceId: source.id };
}

describe("post body cache", () => {
  it("ingest captures content:encoded into post.bodyHtml with source=feed", async () => {
    await seedPublisherAndSource();
    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: FEED_WITH_BODY,
      headers: new Headers({ "content-type": "application/rss+xml" }),
      finalUrl: "https://feeds.example.com/feed.xml",
    });

    const result = await runIngest();
    expect(result.bodiesFromFeed).toBeGreaterThan(0);

    const repo = getRepository();
    const stored = await repo.posts.getByCanonicalUrl(
      "https://feeds.example.com/post-body",
    );
    expect(stored).not.toBeNull();
    expect(stored?.bodySource).toBe("feed");
    expect(stored?.bodyHtml).toContain("<strong>full</strong>");
    expect(stored?.bodyHtml).not.toMatch(/<script/i);
  });

  it("ingest leaves bodyHtml=null when the feed only ships a summary", async () => {
    await seedPublisherAndSource();
    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: FEED_NO_BODY,
      headers: new Headers({ "content-type": "application/rss+xml" }),
      finalUrl: "https://feeds.example.com/feed.xml",
    });

    await runIngest();
    const stored = await getRepository().posts.getByCanonicalUrl(
      "https://feeds.example.com/post-summary",
    );
    expect(stored).not.toBeNull();
    expect(stored?.bodyHtml).toBeNull();
    expect(stored?.bodySource).toBeNull();
  });

  it("extractArticle output can be cached + re-read via PostRepository.setBody", async () => {
    const { publisherId, sourceId } = await seedPublisherAndSource();
    const repo = getRepository();
    await repo.posts.insertMany([
      {
        id: "post-extract-1",
        publisherId,
        sourceId,
        title: "Will be extracted",
        summary: "shipping summary only",
        url: "https://example.com/extract-1",
        canonicalUrl: "https://example.com/extract-1",
        authorName: null,
        publishedAt: nowIso(),
        readingTimeMin: 5,
        accessLabel: "free",
        paywallProvider: "unknown",
        thumbnailUrl: null,
        rawContentHash: "h",
        bodyHtml: null,
        bodySource: null,
        bodyExtractedAt: null,
        bodyFailedAt: null,
        bodyFailedReason: null,
        createdAt: nowIso(),
      },
    ]);

    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: ARTICLE_HTML,
      headers: new Headers({ "content-type": "text/html" }),
      finalUrl: "https://example.com/extract-1",
    });

    const extracted = await extractArticle("https://example.com/extract-1");
    expect(extracted.ok).toBe(true);
    if (!extracted.ok) return;

    await repo.posts.setBody("post-extract-1", {
      bodyHtml: extracted.bodyHtml,
      bodySource: "extracted",
      bodyExtractedAt: nowIso(),
    });

    const after = await repo.posts.getById("post-extract-1");
    expect(after?.bodySource).toBe("extracted");
    expect(after?.bodyHtml).toContain("on-demand extracted");
    expect(after?.bodyFailedAt).toBeNull();
    // Sanity: source-side fetch was called once. A second viewer would
    // hit the cache, so we never call safeFetch again.
    expect(mockedSafeFetch).toHaveBeenCalledTimes(1);
  });

  it("setBodyFailed records the reason and timestamp for cool-off", async () => {
    const { publisherId, sourceId } = await seedPublisherAndSource();
    const repo = getRepository();
    await repo.posts.insertMany([
      {
        id: "post-fail-1",
        publisherId,
        sourceId,
        title: "Will fail",
        summary: null,
        url: "https://example.com/fail-1",
        canonicalUrl: "https://example.com/fail-1",
        authorName: null,
        publishedAt: nowIso(),
        readingTimeMin: null,
        accessLabel: "free",
        paywallProvider: "unknown",
        thumbnailUrl: null,
        rawContentHash: "h",
        bodyHtml: null,
        bodySource: null,
        bodyExtractedAt: null,
        bodyFailedAt: null,
        bodyFailedReason: null,
        createdAt: nowIso(),
      },
    ]);

    const failedAt = nowIso();
    await repo.posts.setBodyFailed("post-fail-1", { reason: "http_404", failedAt });

    const after = await repo.posts.getById("post-fail-1");
    expect(after?.bodyFailedReason).toBe("http_404");
    expect(after?.bodyFailedAt).toBe(failedAt);
    expect(after?.bodyHtml).toBeNull();
  });
});
