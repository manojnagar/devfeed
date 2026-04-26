/**
 * @file Tests for `lib/ids.ts`.
 */

import { describe, it, expect } from "vitest";
import { genId, hashWithDailySalt, shortHash, slugify } from "@/lib/ids";

describe("slugify", () => {
  it("lowercases + dashes", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("strips diacritics", () => {
    expect(slugify("Café")).toBe("cafe");
  });
  it("collapses repeated hyphens and trims", () => {
    expect(slugify("  Hello---World!! ")).toBe("hello-world");
  });
  it("limits length", () => {
    const out = slugify("a".repeat(200));
    expect(out.length).toBeLessThanOrEqual(80);
  });
});

describe("shortHash", () => {
  it("is deterministic and 8 chars", () => {
    const a = shortHash("foo");
    const b = shortHash("foo");
    expect(a).toBe(b);
    expect(a).toHaveLength(8);
  });
  it("differs for different inputs", () => {
    expect(shortHash("foo")).not.toBe(shortHash("bar"));
  });
});

describe("genId", () => {
  it("returns a UUID-shaped string", () => {
    expect(genId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});

describe("hashWithDailySalt", () => {
  it("differs by salt", () => {
    expect(hashWithDailySalt("ip", "2026-01-01")).not.toBe(hashWithDailySalt("ip", "2026-01-02"));
  });
});
