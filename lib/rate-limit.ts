/**
 * @file Suggestion rate-limit helpers.
 *
 * The product rule (PLAN.md §6.3): each user may have at most 3
 * pending suggestions and submit at most 10 in a rolling week. Pure
 * function — counts come from the SuggestionRepository.
 */

export interface RateLimitInput {
  pendingCount: number;
  weekCount: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  reason?: "too_many_pending" | "weekly_cap_reached";
}

const MAX_PENDING = 3;
const MAX_PER_WEEK = 10;

/**
 * Decide whether the current submission may proceed.
 *
 * @param input  Current pending + weekly counts for the user.
 * @returns      `{ allowed: false }` plus a machine-readable reason.
 */
export function evaluateSuggestionRateLimit(input: RateLimitInput): RateLimitDecision {
  if (input.pendingCount >= MAX_PENDING) {
    return { allowed: false, reason: "too_many_pending" };
  }
  if (input.weekCount >= MAX_PER_WEEK) {
    return { allowed: false, reason: "weekly_cap_reached" };
  }
  return { allowed: true };
}

export const SUGGESTION_LIMITS = { MAX_PENDING, MAX_PER_WEEK };
