/**
 * @file Tests for the suggestion rate-limit evaluator.
 */

import { describe, it, expect } from "vitest";
import { evaluateSuggestionRateLimit, SUGGESTION_LIMITS } from "@/lib/rate-limit";

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
