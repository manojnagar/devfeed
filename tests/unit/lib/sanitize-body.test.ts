/**
 * @file Tests for the post body HTML sanitizer.
 *
 * The sanitizer is the single trust boundary between untrusted feed /
 * extracted content and `dangerouslySetInnerHTML`. Each test pins one
 * concrete attack we never want to ship to a browser.
 */

import { describe, it, expect } from "vitest";
import { sanitizePostBody } from "@/lib/ingest/sanitize-body";

describe("sanitizePostBody", () => {
  it("returns empty string for nullish input", () => {
    expect(sanitizePostBody(null)).toBe("");
    expect(sanitizePostBody(undefined)).toBe("");
    expect(sanitizePostBody("")).toBe("");
  });

  it("preserves the safe allow-list of tags", () => {
    const html = `<h2>Heading</h2><p>Some <strong>bold</strong> and <em>italic</em>.</p>`;
    const out = sanitizePostBody(html);
    expect(out).toContain("<h2>Heading</h2>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
  });

  it("strips <script> tags and inline JS handlers", () => {
    const html = `<p onclick="alert(1)">Hi <script>alert('xss')</script></p>`;
    const out = sanitizePostBody(html);
    expect(out).not.toMatch(/script/i);
    expect(out).not.toMatch(/onclick/i);
    expect(out).toContain("Hi");
  });

  it("rejects javascript: URLs in href", () => {
    const html = `<a href="javascript:alert('xss')">click</a>`;
    const out = sanitizePostBody(html);
    expect(out).not.toMatch(/javascript:/i);
  });

  it("rejects javascript: and data: URLs in img src", () => {
    const html = `<img src="javascript:alert(1)" /><img src="data:image/png;base64,xyz" />`;
    const out = sanitizePostBody(html);
    expect(out).not.toMatch(/javascript:/i);
    expect(out).not.toMatch(/data:image/i);
  });

  it("forces target=_blank and rel=noopener noreferrer nofollow on links", () => {
    const html = `<a href="https://example.com/x">link</a>`;
    const out = sanitizePostBody(html);
    expect(out).toMatch(/target="_blank"/);
    expect(out).toMatch(/rel="noopener noreferrer nofollow"/);
  });

  it("adds loading=lazy to images", () => {
    const html = `<img src="https://example.com/p.png" alt="ok" />`;
    const out = sanitizePostBody(html);
    expect(out).toMatch(/loading="lazy"/);
    expect(out).toMatch(/alt="ok"/);
  });

  it("strips <iframe>, <object>, and <style> tags", () => {
    const html = `<iframe src="https://e.com"></iframe><object></object><style>body{}</style>`;
    const out = sanitizePostBody(html);
    expect(out).not.toMatch(/iframe/i);
    expect(out).not.toMatch(/<object/i);
    expect(out).not.toMatch(/<style/i);
  });

  it("strips h1 (page already renders the title as h1)", () => {
    const html = `<h1>Big Title</h1><p>Body</p>`;
    const out = sanitizePostBody(html);
    expect(out).not.toMatch(/<h1>/);
    expect(out).toContain("<p>Body</p>");
  });
});
