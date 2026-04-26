/**
 * @file Tests for the suggestion rate-limit evaluator.
 */

import { afterEach, describe, it, expect } from "vitest";
import {
  __resetSlidingLimits,
  consumeSlidingLimit,
  evaluateSuggestionRateLimit,
  SUGGESTION_LIMITS,
} from "@/lib/rate-limit";

describe("evaluateSuggestionRateLimit", () => {
  it("allows when under both caps", () => {
    expect(evaluateSuggestionRateLimit({ pendingCount: 0, weekCount: 0 })).toEqual({ allowed: true });
  });
  it("blocks when pending cap is reached", () => {
    const r = evaluateSuggestionRateLimit({ pendingCount: SUGGESTION_LIMITS.MAX_PENDING, weekCount: 0 });
    expect(r).toEqual({ allowed: false, reason: "too_many_pending" });
  });
  it("blocks when weekly cap is reached", () => {
    const r = evaluateSuggestionRateLimit({ pendingCount: 0, weekCount: SUGGESTION_LIMITS.MAX_PER_WEEK });
    expect(r).toEqual({ allowed: false, reason: "weekly_cap_reached" });
  });
});

describe("consumeSlidingLimit", () => {
  afterEach(() => {
    __resetSlidingLimits();
  });

  it("permits up to `max` events inside the window then blocks", () => {
    let now = 1_000_000;
    const params = { key: "k", windowMs: 60_000, max: 3, now: () => now };

    expect(consumeSlidingLimit(params).allowed).toBe(true);
    expect(consumeSlidingLimit(params).allowed).toBe(true);
    expect(consumeSlidingLimit(params).allowed).toBe(true);
    const blocked = consumeSlidingLimit(params);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);

    now += 60_001;
    expect(consumeSlidingLimit(params).allowed).toBe(true);
  });

  it("isolates buckets by key", () => {
    const t = () => 1;
    expect(
      consumeSlidingLimit({ key: "a", windowMs: 1_000, max: 1, now: t }).allowed,
    ).toBe(true);
    expect(
      consumeSlidingLimit({ key: "a", windowMs: 1_000, max: 1, now: t }).allowed,
    ).toBe(false);
    expect(
      consumeSlidingLimit({ key: "b", windowMs: 1_000, max: 1, now: t }).allowed,
    ).toBe(true);
  });
});
