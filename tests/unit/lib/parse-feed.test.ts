/**
 * @file Tests for the lightweight RSS/Atom feed parser.
 */

import { describe, it, expect } from "vitest";
import { parseFeed } from "@/lib/ingest/parse-feed";

const RSS_FIXTURE = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Example Engineering</title>
  <item>
    <title><![CDATA[Hello World]]></title>
    <link>https://example.com/post-1</link>
    <description><![CDATA[A short summary.]]></description>
    <pubDate>Tue, 24 Mar 2026 12:00:00 GMT</pubDate>
    <guid>guid-1</guid>
  </item>
  <item>
    <title>Second Post</title>
    <link>https://example.com/post-2</link>
    <pubDate>Wed, 25 Mar 2026 12:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Engineering</title>
  <entry>
    <title>Atom Post</title>
    <link href="https://example.com/atom-1" />
    <id>tag:example,2026:atom-1</id>
    <updated>2026-03-24T12:00:00Z</updated>
    <summary>Short summary.</summary>
  </entry>
</feed>`;

const RSS_WITH_BODY = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <item>
      <title>Body fixture</title>
      <link>https://example.com/body</link>
      <description>Plain summary</description>
      <content:encoded><![CDATA[<p>The <strong>full</strong> body here.</p><p>Second paragraph.</p>]]></content:encoded>
    </item>
  </channel>
</rss>`;

const ATOM_WITH_BODY = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom body</title>
    <link href="https://example.com/atom-body" />
    <updated>2026-04-25T00:00:00Z</updated>
    <content type="html"><![CDATA[<p>Atom rendered body.</p>]]></content>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("parses RSS items", () => {
    const out = parseFeed(RSS_FIXTURE);
    expect(out.isAtom).toBe(false);
    expect(out.items).toHaveLength(2);
    expect(out.items[0].title).toBe("Hello World");
    expect(out.items[0].link).toBe("https://example.com/post-1");
    expect(out.items[0].summary).toBe("A short summary.");
    expect(out.items[0].guid).toBe("guid-1");
  });
  it("parses Atom entries", () => {
    const out = parseFeed(ATOM_FIXTURE);
    expect(out.isAtom).toBe(true);
    expect(out.items).toHaveLength(1);
    expect(out.items[0].link).toBe("https://example.com/atom-1");
  });
  it("returns an empty list for empty input", () => {
    const out = parseFeed("<rss><channel></channel></rss>");
    expect(out.items).toEqual([]);
  });

  it("captures the raw HTML body from RSS content:encoded when present", () => {
    const out = parseFeed(RSS_WITH_BODY);
    expect(out.items[0].rawBody).toContain("<strong>full</strong>");
    expect(out.items[0].rawBody).toContain("Second paragraph");
    // Plain-text summary stays HTML-stripped for the cards.
    expect(out.items[0].summary).toBe("Plain summary");
  });

  it("captures the raw HTML body from Atom <content>", () => {
    const out = parseFeed(ATOM_WITH_BODY);
    expect(out.items[0].rawBody).toContain("Atom rendered body");
  });

  it("returns rawBody=null when neither content:encoded nor content is present", () => {
    const out = parseFeed(RSS_FIXTURE);
    expect(out.items[0].rawBody).toBeNull();
    expect(out.items[1].rawBody).toBeNull();
  });
});
