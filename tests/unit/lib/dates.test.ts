/**
 * @file Tests for `lib/dates.ts`.
 */

import { describe, it, expect } from "vitest";
import { absoluteDate, readingTimeLabel, relativeTime, todayUtcStamp } from "@/lib/dates";

describe("relativeTime", () => {
  it("emits a relative phrase for recent timestamps", () => {
    const now = new Date("2026-04-25T12:00:00Z");
    const ago = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(ago, now)).toMatch(/3 hours? ago/);
  });
  it("falls back to absolute date for old posts", () => {
    const now = new Date("2026-04-25T12:00:00Z");
    const old = new Date(now.getTime() - 60 * 86_400_000).toISOString();
    expect(relativeTime(old, now)).toMatch(/^[A-Z][a-z]{2} \d/);
  });
  it("handles invalid input", () => {
    expect(relativeTime("not a date")).toBe("");
  });
});

describe("absoluteDate", () => {
  it("formats month + day + year", () => {
    expect(absoluteDate("2026-04-25T12:00:00Z")).toMatch(/Apr 25, 2026/);
  });
});

describe("readingTimeLabel", () => {
  it("returns null for missing values", () => {
    expect(readingTimeLabel(null)).toBeNull();
    expect(readingTimeLabel(0)).toBeNull();
  });
  it("formats minutes", () => {
    expect(readingTimeLabel(5)).toBe("5 min read");
  });
  it("uses <1 for sub-minute reads", () => {
    expect(readingTimeLabel(0.5)).toBe("<1 min read");
  });
});

describe("todayUtcStamp", () => {
  it("returns YYYY-MM-DD", () => {
    expect(todayUtcStamp(new Date("2026-04-25T23:59:00Z"))).toBe("2026-04-25");
  });
});
