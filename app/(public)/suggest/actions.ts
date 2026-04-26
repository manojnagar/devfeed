/**
 * @file Server Actions for the /suggest publisher form.
 */

"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { PublisherSuggestionInputSchema } from "@/lib/schemas";
import { genId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import { evaluateSuggestionRateLimit } from "@/lib/rate-limit";
import { autodiscoverFeed } from "@/lib/ingest/autodiscover";
import { detectAccessLabelFromUrl } from "@/lib/ingest/detect-access";
import { log } from "@/lib/log";

export interface SuggestActionResult {
  ok: boolean;
  errors?: Record<string, string>;
  message?: string;
  suggestionId?: string;
}

/**
 * Create a publisher suggestion. Validates input, enforces rate limits,
 * and runs lightweight auto-validation (RSS detection + access guess).
 */
export async function submitSuggestionAction(
  _prev: SuggestActionResult | null,
  formData: FormData,
): Promise<SuggestActionResult> {
  const session = await requireUser("/suggest");
  const repo = getRepository();

  const limit = evaluateSuggestionRateLimit({
    pendingCount: await repo.suggestions.countPendingForUser(session.user.userId),
    weekCount: await repo.suggestions.countLastWeekForUser(session.user.userId),
  });
  if (!limit.allowed) {
    const message =
      limit.reason === "too_many_pending"
        ? "You already have 3 pending suggestions. Wait for them to be reviewed."
        : "You've reached this week's submission cap. Try again next week.";
    return { ok: false, message };
  }

  const parsed = PublisherSuggestionInputSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    websiteUrl: formData.get("websiteUrl"),
    feedUrl: formData.get("feedUrl") || null,
    reason: formData.get("reason") || null,
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path.join(".")] = issue.message;
    }
    return { ok: false, errors };
  }

  let auto: NonNullable<Awaited<ReturnType<typeof buildAutoValidation>>> = null!;
  try {
    auto = await buildAutoValidation(parsed.data.websiteUrl, parsed.data.feedUrl ?? null);
  } catch (err) {
    log.warn("auto_validation_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const suggestionId = genId();
  await repo.suggestions.insert({
    id: suggestionId,
    submittedByUserId: session.user.userId,
    type: parsed.data.type,
    name: parsed.data.name,
    websiteUrl: parsed.data.websiteUrl,
    feedUrl: parsed.data.feedUrl ?? null,
    feedKind: auto?.rssDetected ? "rss" : null,
    reason: parsed.data.reason ?? null,
    autoValidation: auto,
    status: "pending",
    reviewedByUserId: null,
    reviewerNotes: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  log.info("suggestion_submitted", { suggestionId, type: parsed.data.type });
  redirect(`/me/suggestions?submitted=${suggestionId}`);
}

async function buildAutoValidation(websiteUrl: string, feedUrl: string | null) {
  const notes: string[] = [];
  let rssDetected = false;
  let rssUrl: string | null = feedUrl ?? null;
  let httpStatus: number | null = null;
  if (!feedUrl) {
    const discovery = await autodiscoverFeed(websiteUrl).catch(() => null);
    if (discovery && discovery.feedUrl) {
      rssDetected = true;
      rssUrl = discovery.feedUrl;
      httpStatus = discovery.status;
      notes.push(`Auto-discovered feed at ${discovery.feedUrl}`);
    } else {
      notes.push("No RSS/Atom feed auto-discovered.");
    }
  } else {
    rssDetected = true;
    notes.push("Reviewer-provided feed URL.");
  }
  const inferredAccess = detectAccessLabelFromUrl(websiteUrl);
  return { rssDetected, rssUrl, httpStatus, inferredAccess, notes };
}
