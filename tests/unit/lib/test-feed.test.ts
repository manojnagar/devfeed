/**
 * @file Unit tests for `testFeed` — the dry-run helper used by the admin
 * "Test feed" button. We mock `safeFetch` so we can exercise every
 * branch (HTTP error, SSRF block, parse error, empty feed, healthy
 * feed) without making real network calls.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ingest/safe-fetch", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ingest/safe-fetch")>(
    "@/lib/ingest/safe-fetch",
  );
  return {
    ...actual,
    safeFetch: vi.fn(),
  };
});

import { safeFetch, UnsafeUrlError } from "@/lib/ingest/safe-fetch";
import { testFeed } from "@/lib/ingest/test-feed";

const mockedSafeFetch = vi.mocked(safeFetch);

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Engineering blog</title>
    <item>
      <title>Scaling our index</title>
      <link>https://example.com/posts/scaling</link>
      <pubDate>Wed, 02 Apr 2025 12:00:00 GMT</pubDate>
      <description>How we scaled.</description>
    </item>
    <item>
      <title>Postmortem: outage</title>
      <link>https://example.com/posts/outage</link>
      <pubDate>Mon, 01 Apr 2025 09:00:00 GMT</pubDate>
      <description>What broke.</description>
    </item>
  </channel>
</rss>`;

afterEach(() => {
  mockedSafeFetch.mockReset();
});

describe("testFeed", () => {
  it("returns ok=true with item count + sample for a healthy RSS feed", async () => {
    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: SAMPLE_RSS,
      headers: new Headers({ "content-type": "application/rss+xml" }),
      finalUrl: "https://example.com/feed.xml",
    });

    const result = await testFeed("https://example.com/feed.xml");

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.contentType).toBe("application/rss+xml");
    expect(result.itemCount).toBe(2);
    expect(result.isAtom).toBe(false);
    expect(result.sampleItems).toHaveLength(2);
    expect(result.sampleItems[0].title).toBe("Scaling our index");
    expect(result.error).toBeNull();
  });

  it("returns ok=false with an error when the upstream returns 5xx", async () => {
    mockedSafeFetch.mockResolvedValueOnce({
      status: 503,
      body: "",
      headers: new Headers(),
      finalUrl: "https://example.com/feed.xml",
    });

    const result = await testFeed("https://example.com/feed.xml");

    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.error).toMatch(/HTTP 503/);
    expect(result.itemCount).toBe(0);
  });

  it("warns when the response parses but contains 0 items", async () => {
    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: "<html><body>Not a feed</body></html>",
      headers: new Headers({ "content-type": "text/html" }),
      finalUrl: "https://example.com/",
    });

    const result = await testFeed("https://example.com/");

    expect(result.ok).toBe(false);
    expect(result.itemCount).toBe(0);
    expect(result.warnings.some((w) => w.includes("0 items"))).toBe(true);
  });

  it("flags unexpected content-type as a warning even when items parse", async () => {
    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: SAMPLE_RSS,
      headers: new Headers({ "content-type": "application/json" }),
      finalUrl: "https://example.com/feed.xml",
    });

    const result = await testFeed("https://example.com/feed.xml");

    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes("application/json"))).toBe(true);
  });

  it("converts UnsafeUrlError into a friendly SSRF message", async () => {
    mockedSafeFetch.mockRejectedValueOnce(
      new UnsafeUrlError("Private host blocked: 127.0.0.1", "host"),
    );

    const result = await testFeed("http://127.0.0.1/feed");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/SSRF guard/);
    expect(result.error).toMatch(/host/);
  });

  it("converts AbortError into a timeout message", async () => {
    const abortErr = new Error("aborted");
    abortErr.name = "AbortError";
    mockedSafeFetch.mockRejectedValueOnce(abortErr);

    const result = await testFeed("https://example.com/slow");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/timed out/i);
  });
});
