/**
 * @file Tests for the keyword-based auto-tagger.
 */

import { describe, it, expect } from "vitest";
import { autoTag } from "@/lib/ingest/auto-tag";

describe("autoTag", () => {
  it("returns matching tag slugs for a single keyword", () => {
    const r = autoTag({ title: "Why we adopted Rust", summary: null });
    expect(r.slugs).toContain("rust");
  });
  it("matches across title + summary", () => {
    const r = autoTag({
      title: "Lessons learned",
      summary: "We migrated our infrastructure to Kubernetes and improved performance.",
    });
    expect(r.slugs).toEqual(expect.arrayContaining(["kubernetes", "performance"]));
  });
  it("returns empty slugs for unrecognised content", () => {
    const r = autoTag({ title: "An obscure topic", summary: "Nothing technical here." });
    expect(r.slugs).toEqual([]);
  });
  it("uses the supplied dictionary when provided", () => {
    const r = autoTag(
      { title: "Custom dict test", summary: null },
      [{ slug: "custom", name: "Custom", description: "", featured: false, keywords: ["custom"] }],
    );
    expect(r.slugs).toEqual(["custom"]);
  });
});
