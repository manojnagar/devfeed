/**
 * @file Tests for the heuristic access-label detector.
 */

import { describe, it, expect } from "vitest";
import { detectAccess, detectAccessLabelFromUrl } from "@/lib/ingest/detect-access";

describe("detectAccess", () => {
  it("flags a substack post with paid hint as paid", () => {
    const r = detectAccess({
      postUrl: "https://example.substack.com/p/secret",
      publisherDefault: "free",
      publisherDefaultProvider: "substack",
      bodyHints: "this post is for paying subscribers",
    });
    expect(r.accessLabel).toBe("paid");
    expect(r.paywallProvider).toBe("substack");
    expect(r.confidence).toBe("high");
  });
  it("falls back to publisher default when no hints", () => {
    const r = detectAccess({
      postUrl: "https://stripe.com/blog/post",
      publisherDefault: "free",
      publisherDefaultProvider: "unknown",
    });
    expect(r.accessLabel).toBe("free");
    expect(r.confidence).toBe("low");
  });
});

describe("detectAccessLabelFromUrl", () => {
  it("infers mixed for substack hosts", () => {
    expect(detectAccessLabelFromUrl("https://blog.substack.com")).toBe("mixed");
  });
  it("infers members_only for medium hosts", () => {
    expect(detectAccessLabelFromUrl("https://medium.com/team")).toBe("members_only");
  });
  it("defaults to free for unknown hosts", () => {
    expect(detectAccessLabelFromUrl("https://example.com")).toBe("free");
  });
});
