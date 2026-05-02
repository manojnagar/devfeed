/**
 * @file Unit tests for the on-demand article extractor.
 *
 * `safeFetch` is mocked so we exercise every branch (happy, http error,
 * empty response, SSRF, parse / readability failure, body-too-short)
 * without making real network calls.
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
import { extractArticle } from "@/lib/ingest/extract-article";

const mockedSafeFetch = vi.mocked(safeFetch);

const ARTICLE_HTML = `<!doctype html><html><head><title>X</title></head><body>
<article>
  <h1>Real article title</h1>
  <p>This is the first paragraph of a substantial blog post about scaling Postgres
     databases to handle billions of rows. We need at least a few hundred characters
     of body text so Mozilla Readability flags this as a real article.</p>
  <p>Another paragraph with <a href="https://example.com/details">a relevant link</a>
     and <strong>emphasised text</strong> to keep the score high. We will write a few
     more sentences to push the body over the threshold the extractor enforces.</p>
  <p>Final paragraph with even more content describing the architectural decisions
     we made along the way and why they mattered for the team's productivity.</p>
</article>
</body></html>`;

afterEach(() => {
  mockedSafeFetch.mockReset();
});

describe("extractArticle", () => {
  it("returns sanitized article body on success", async () => {
    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: ARTICLE_HTML,
      headers: new Headers({ "content-type": "text/html" }),
      finalUrl: "https://example.com/post",
    });

    const result = await extractArticle("https://example.com/post");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bodyHtml).toContain("scaling Postgres");
      expect(result.bodyHtml).toMatch(/<a [^>]*target="_blank"/);
      expect(result.bodyHtml).toMatch(/rel="noopener noreferrer nofollow"/);
      expect(result.bodyHtml).not.toMatch(/<script/i);
    }
  });

  it("returns ok=false with http_NNN reason when upstream errors", async () => {
    mockedSafeFetch.mockResolvedValueOnce({
      status: 503,
      body: "",
      headers: new Headers(),
      finalUrl: "https://example.com/post",
    });

    const result = await extractArticle("https://example.com/post");
    expect(result).toEqual({ ok: false, reason: "http_503" });
  });

  it("returns ok=false with empty_response when body is missing", async () => {
    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: "",
      headers: new Headers(),
      finalUrl: "https://example.com/post",
    });

    const result = await extractArticle("https://example.com/post");
    expect(result).toEqual({ ok: false, reason: "empty_response" });
  });

  it("returns ok=false with ssrf_* reason when safeFetch rejects", async () => {
    mockedSafeFetch.mockRejectedValueOnce(
      new UnsafeUrlError("Private host blocked: 127.0.0.1", "host"),
    );

    const result = await extractArticle("http://127.0.0.1/x");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("ssrf_host");
    }
  });

  it("returns ok=false with no_article_content for a stub HTML page", async () => {
    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: "<html><body><div>tiny</div></body></html>",
      headers: new Headers({ "content-type": "text/html" }),
      finalUrl: "https://example.com/empty",
    });

    const result = await extractArticle("https://example.com/empty");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["no_article_content", "body_too_short"]).toContain(result.reason);
    }
  });

  it("scrubs <script> from extracted output", async () => {
    const html = ARTICLE_HTML.replace(
      "</article>",
      "<script>alert('xss')</script></article>",
    );
    mockedSafeFetch.mockResolvedValueOnce({
      status: 200,
      body: html,
      headers: new Headers({ "content-type": "text/html" }),
      finalUrl: "https://example.com/post",
    });

    const result = await extractArticle("https://example.com/post");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.bodyHtml).not.toMatch(/<script/i);
  });
});
