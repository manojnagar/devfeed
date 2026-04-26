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

/**
 * Per-actor sliding-window rate limiter for short-lived admin actions
 * that touch the network (currently the "Test feed" dry-run). The store
 * is process-local so it works in dev mode and on a single Vercel
 * instance; for multi-instance prod we'd swap this for a Redis-backed
 * impl behind the same interface.
 */
const SLIDING_WINDOW_BUCKETS = new Map<string, number[]>();

export interface SlidingLimitInput {
  /** Bucket key — typically `${action}:${actorId}`. */
  key: string;
  /** Window length in milliseconds (e.g. 60_000 for "per minute"). */
  windowMs: number;
  /** Max number of events allowed inside the window. */
  max: number;
  /** Override `Date.now()` — only used by tests. */
  now?: () => number;
}

export interface SlidingLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Record an attempt against `key`. Returns `allowed: true` and
 * decrements the bucket if there is room; otherwise `allowed: false`
 * with the smallest delay until the next attempt would succeed.
 */
export function consumeSlidingLimit(input: SlidingLimitInput): SlidingLimitDecision {
  const now = (input.now ?? Date.now)();
  const cutoff = now - input.windowMs;
  const recent = (SLIDING_WINDOW_BUCKETS.get(input.key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= input.max) {
    const oldest = recent[0];
    SLIDING_WINDOW_BUCKETS.set(input.key, recent);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + input.windowMs - now),
    };
  }

  recent.push(now);
  SLIDING_WINDOW_BUCKETS.set(input.key, recent);
  return {
    allowed: true,
    remaining: Math.max(0, input.max - recent.length),
    retryAfterMs: 0,
  };
}

/** Test-only: drop all sliding-window state. */
export function __resetSlidingLimits(): void {
  SLIDING_WINDOW_BUCKETS.clear();
}
