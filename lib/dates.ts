/**
 * @file Date / time helpers.
 *
 * Centralises date formatting so the entire UI uses a consistent
 * vocabulary: relative ("3h ago") for recent timestamps, absolute
 * ("Apr 12, 2026") for older ones, with full ISO datetimes preserved
 * in `<time dateTime>` attributes for screen readers.
 */

import { formatDistanceStrict, format, parseISO, isValid } from "date-fns";

/**
 * Convert "x time ago" into a short, screen-reader-friendly string.
 *
 * Falls back to absolute date for anything older than 30 days so the
 * feed doesn't end up with "11 mo ago" on year-old posts. The optional
 * `now` argument exists so tests can pin "now" deterministically.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = parseISO(iso);
  if (!isValid(date)) return "";
  const ageDays = (now.getTime() - date.getTime()) / 86_400_000;
  if (ageDays > 30) return format(date, "MMM d, yyyy");
  return formatDistanceStrict(date, now, { addSuffix: true });
}

/** Full absolute date (e.g. "Apr 12, 2026"). */
export function absoluteDate(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, "MMM d, yyyy") : "";
}

/** "5 min read" formatter; returns null when reading time is unknown. */
export function readingTimeLabel(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) return null;
  if (minutes < 1) return "<1 min read";
  return `${Math.round(minutes)} min read`;
}

/** ISO string for "now" — extracted so tests can mock it. */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Daily-rotating salt source — a UTC date string like `"2026-04-25"`.
 * Pair with `hashWithDailySalt` to anonymise read events.
 */
export function todayUtcStamp(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
