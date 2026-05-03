/**
 * @file Server Actions for the /admin/* pages.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import {
  PublisherTypeEnum,
  SuggestionDecisionSchema,
  AccessLabelEnum,
  SourceKindEnum,
  SetUserRoleSchema,
  SetUserBannedSchema,
  SetSourceActiveSchema,
  SourceIdSchema,
  TestFeedSchema,
  UpdateSourceSchema,
  UrlSchema,
  SlugSchema,
} from "@/lib/schemas";
import { consumeSlidingLimit } from "@/lib/rate-limit";
import { testFeed, type TestFeedResult } from "@/lib/ingest/test-feed";
import { genId, slugify } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import { log } from "@/lib/log";

/**
 * Empty strings come through as `""` in `FormData` even when the user
 * leaves the field blank. We normalize them to `null` BEFORE zod parses
 * so the optional URL fields don't trip the `z.string().url()` check.
 */
function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const PublisherUpsertSchema = z.object({
  id: z.string().optional(),
  type: PublisherTypeEnum,
  name: z.string().trim().min(2).max(120),
  slug: SlugSchema.optional(),
  websiteUrl: UrlSchema,
  logoUrl: UrlSchema.nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  defaultAccessLabel: AccessLabelEnum.default("free"),
  twitterHandle: z.string().trim().max(50).nullable().optional(),
  githubHandle: z.string().trim().max(50).nullable().optional(),
});

/**
 * Create or update a publisher (admin only).
 *
 * Update path: when an `id` is present in the form payload we look up
 * the existing record and preserve fields that are NOT exposed in the
 * admin form (`isActive`, `isVerified`, `homeCountry`,
 * `defaultPaywallProvider`, `createdAt`). Without this preservation
 * every save would silently re-activate a hidden publisher and reset
 * its created-at timestamp. The slug is also preserved across edits
 * (passed back as a hidden input by the edit form) — changing a slug
 * breaks bookmarks and inbound links, so renaming a publisher requires
 * delete + recreate.
 */
export async function upsertPublisherAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const parsed = PublisherUpsertSchema.parse({
    id: emptyToNull(formData.get("id")) ?? undefined,
    type: formData.get("type"),
    name: formData.get("name"),
    slug: emptyToNull(formData.get("slug")) ?? undefined,
    websiteUrl: formData.get("websiteUrl"),
    logoUrl: emptyToNull(formData.get("logoUrl")),
    description: emptyToNull(formData.get("description")),
    defaultAccessLabel: (formData.get("defaultAccessLabel") as string) || "free",
    twitterHandle: emptyToNull(formData.get("twitterHandle")),
    githubHandle: emptyToNull(formData.get("githubHandle")),
  });

  const repo = getRepository();
  const isUpdate = Boolean(parsed.id);
  const existing = isUpdate ? await repo.publishers.getById(parsed.id as string) : null;
  if (isUpdate && !existing) {
    log.warn("admin_publisher_update_missing", {
      actor: session.user.userId,
      id: parsed.id,
    });
    throw new Error("Publisher not found.");
  }

  const id = parsed.id ?? genId();
  const slug = parsed.slug ?? existing?.slug ?? slugify(parsed.name);
  const now = nowIso();

  await repo.publishers.upsert({
    id,
    type: parsed.type,
    slug,
    name: parsed.name,
    websiteUrl: parsed.websiteUrl,
    description: parsed.description ?? null,
    logoUrl: parsed.logoUrl ?? null,
    twitterHandle: parsed.twitterHandle ?? null,
    githubHandle: parsed.githubHandle ?? null,
    homeCountry: existing?.homeCountry ?? null,
    defaultAccessLabel: parsed.defaultAccessLabel,
    defaultPaywallProvider: existing?.defaultPaywallProvider ?? "unknown",
    isVerified: existing?.isVerified ?? false,
    isActive: existing?.isActive ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: isUpdate ? "publisher.update" : "publisher.create",
    targetType: "publisher",
    targetId: id,
    payload: { name: parsed.name, slug, type: parsed.type },
    occurredAt: now,
  });
  log.info("admin_publisher_upserted", {
    id,
    slug,
    update: isUpdate,
    actor: session.user.userId,
  });
  revalidatePath("/admin/publishers");
  revalidatePath(`/admin/publishers/${id}/edit`);
  revalidatePath("/publishers");
  revalidatePath(`/publishers/${slug}`);
  redirect("/admin/publishers");
}

const DeletePublisherSchema = z.object({
  id: z.string().trim().min(1).max(200),
  confirm: z.literal("DELETE"),
});

/**
 * Hard-delete a publisher.
 *
 * CAUTION: cascades to every post, post_tag, blog_source,
 * follow_publisher, bookmark, and read_event row that references this
 * publisher (FK `on delete cascade` in the SQL schema; replicated by
 * the in-memory adapter for parity). The admin UI surfaces a native
 * `confirm()` dialog before invoking this; we still re-check here so
 * a forged or stale form submission can't bypass the warning.
 *
 * Defense in depth:
 *   1. `requireAdmin()` — caller must be an authenticated, non-banned admin.
 *   2. zod schema requires `confirm === "DELETE"`.
 *   3. Idempotent — re-deletes are no-ops with an audit-log warning.
 */
export async function deletePublisherAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const parsed = DeletePublisherSchema.safeParse({
    id: formData.get("id"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    log.warn("admin_delete_publisher_invalid", {
      actor: session.user.userId,
      issues: parsed.error.issues.map((i) => i.message),
    });
    throw new Error("Delete was not confirmed.");
  }

  const repo = getRepository();
  const existing = await repo.publishers.getById(parsed.data.id);
  if (!existing) {
    log.warn("admin_delete_publisher_missing", {
      actor: session.user.userId,
      id: parsed.data.id,
    });
    revalidatePath("/admin/publishers");
    redirect("/admin/publishers");
  }

  await repo.publishers.delete(parsed.data.id);
  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: "publisher.delete",
    targetType: "publisher",
    targetId: parsed.data.id,
    payload: {
      name: existing.name,
      slug: existing.slug,
      type: existing.type,
      websiteUrl: existing.websiteUrl,
    },
    occurredAt: nowIso(),
  });
  log.info("admin_publisher_deleted", {
    actor: session.user.userId,
    id: parsed.data.id,
    slug: existing.slug,
  });
  revalidatePath("/admin/publishers");
  revalidatePath("/publishers");
  revalidatePath(`/publishers/${existing.slug}`);
  redirect("/admin/publishers");
}

/** Toggle a publisher's active state. */
export async function togglePublisherActiveAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  const next = formData.get("active") === "true";
  const repo = getRepository();
  await repo.publishers.setActive(id, next);
  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: next ? "publisher.activate" : "publisher.deactivate",
    targetType: "publisher",
    targetId: id,
    payload: {},
    occurredAt: nowIso(),
  });
  revalidatePath("/admin/publishers");
}

const SourceUpsertSchema = z.object({
  publisherId: z.string().min(1),
  feedUrl: UrlSchema,
  kind: SourceKindEnum.default("rss"),
});

/** Add a feed source to a publisher. */
export async function addSourceAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const parsed = SourceUpsertSchema.parse({
    publisherId: formData.get("publisherId"),
    feedUrl: formData.get("feedUrl"),
    kind: formData.get("kind") || "rss",
  });
  const repo = getRepository();
  const id = genId();
  await repo.blogSources.upsert({
    id,
    publisherId: parsed.publisherId,
    kind: parsed.kind,
    feedUrl: parsed.feedUrl,
    scrapeConfig: null,
    isActive: true,
    lastFetchedAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,
    createdAt: nowIso(),
  });
  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: "source.create",
    targetType: "source",
    targetId: id,
    payload: { feedUrl: parsed.feedUrl, kind: parsed.kind },
    occurredAt: nowIso(),
  });
  revalidatePath("/admin/sources");
}

/**
 * Result returned by the source-management actions so client UIs can
 * render an inline success/error pill via `useActionState`.
 */
export interface SourceActionResult {
  ok: boolean;
  message?: string;
  /** Number of posts cascaded by a delete (for confirmation UX). */
  deletedPostCount?: number;
}

const DUPLICATE_FEED_URL_MSG =
  "That publisher already has this feed URL configured. Pick a different URL or delete the existing source first.";

/**
 * Update an existing blog source — admin only.
 *
 * Used to fix typos in a feed URL, change the source kind (rss/atom/scrape),
 * or reassign the source to a different publisher. Health columns
 * (`last_fetched_at`, `consecutive_failures`, …) are intentionally NOT
 * editable from the admin UI — they're owned by the ingest cron.
 *
 * Guards:
 *   1. `requireAdmin()` — caller must be an authenticated, non-banned admin.
 *   2. The (publisherId, feedUrl) tuple must remain unique. The repository
 *      surfaces the conflict as a `DUPLICATE_FEED_URL` sentinel; we
 *      translate that into a friendly message.
 *   3. The target source must still exist (race-safe — fetch + audit).
 */
export async function updateSourceAction(
  _prev: SourceActionResult | null,
  formData: FormData,
): Promise<SourceActionResult> {
  const session = await requireAdmin();
  const parsed = UpdateSourceSchema.safeParse({
    id: formData.get("id"),
    publisherId: formData.get("publisherId"),
    feedUrl: formData.get("feedUrl"),
    kind: formData.get("kind"),
  });
  if (!parsed.success) {
    log.warn("admin_update_source_invalid", {
      actor: session.user.userId,
      issues: parsed.error.issues.map((i) => i.message),
    });
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid source payload.",
    };
  }

  const repo = getRepository();
  const existing = await repo.blogSources.getById(parsed.data.id);
  if (!existing) {
    return { ok: false, message: "That source no longer exists." };
  }

  const publisher = await repo.publishers.getById(parsed.data.publisherId);
  if (!publisher) {
    return { ok: false, message: "Selected publisher does not exist." };
  }

  try {
    await repo.blogSources.update(parsed.data.id, {
      publisherId: parsed.data.publisherId,
      feedUrl: parsed.data.feedUrl,
      kind: parsed.data.kind,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "DUPLICATE_FEED_URL") {
      log.warn("admin_update_source_dup_feed", {
        actor: session.user.userId,
        feedUrl: parsed.data.feedUrl,
      });
      return { ok: false, message: DUPLICATE_FEED_URL_MSG };
    }
    throw err;
  }

  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: "source.update",
    targetType: "source",
    targetId: parsed.data.id,
    payload: {
      from: {
        publisherId: existing.publisherId,
        feedUrl: existing.feedUrl,
        kind: existing.kind,
      },
      to: {
        publisherId: parsed.data.publisherId,
        feedUrl: parsed.data.feedUrl,
        kind: parsed.data.kind,
      },
    },
    occurredAt: nowIso(),
  });
  log.info("admin_source_updated", {
    actor: session.user.userId,
    id: parsed.data.id,
    feedUrl: parsed.data.feedUrl,
  });
  revalidatePath("/admin/sources");
  return { ok: true, message: "Source updated." };
}

/**
 * Toggle a blog source's `is_active` flag. Inactive sources are excluded
 * from the ingest cron but their historical posts remain visible — this
 * is the safe "pause without data loss" path before a destructive delete.
 */
export async function setSourceActiveAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const parsed = SetSourceActiveSchema.parse({
    id: formData.get("id"),
    isActive: formData.get("isActive") === "true",
  });
  const repo = getRepository();
  const existing = await repo.blogSources.getById(parsed.id);
  if (!existing) return;
  if (existing.isActive === parsed.isActive) return;

  await repo.blogSources.setActive(parsed.id, parsed.isActive);
  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: parsed.isActive ? "source.activate" : "source.deactivate",
    targetType: "source",
    targetId: parsed.id,
    payload: { feedUrl: existing.feedUrl, publisherId: existing.publisherId },
    occurredAt: nowIso(),
  });
  log.info("admin_source_active_toggled", {
    actor: session.user.userId,
    id: parsed.id,
    isActive: parsed.isActive,
  });
  revalidatePath("/admin/sources");
}

/**
 * Hard-delete a blog source. CAUTION: in production this cascades to
 * every post + post_tag row that references the source (see migration
 * 0002 — `posts.source_id ... on delete cascade`). The admin UI surfaces
 * a confirm dialog before invoking this; we still re-check here so a
 * forged/stale form submission can't bypass the warning.
 */
export async function deleteSourceAction(
  _prev: SourceActionResult | null,
  formData: FormData,
): Promise<SourceActionResult> {
  const session = await requireAdmin();
  const parsed = SourceIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return { ok: false, message: "Invalid source id." };
  }
  if (formData.get("confirm") !== "DELETE") {
    log.warn("admin_delete_source_unconfirmed", {
      actor: session.user.userId,
      id: parsed.data.id,
    });
    return {
      ok: false,
      message: "Delete was not confirmed — type DELETE in the confirm box.",
    };
  }

  const repo = getRepository();
  const existing = await repo.blogSources.getById(parsed.data.id);
  if (!existing) {
    return { ok: false, message: "Source already gone." };
  }

  await repo.blogSources.delete(parsed.data.id);
  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: "source.delete",
    targetType: "source",
    targetId: parsed.data.id,
    payload: {
      publisherId: existing.publisherId,
      feedUrl: existing.feedUrl,
      kind: existing.kind,
    },
    occurredAt: nowIso(),
  });
  log.info("admin_source_deleted", {
    actor: session.user.userId,
    id: parsed.data.id,
    feedUrl: existing.feedUrl,
  });
  revalidatePath("/admin/sources");
  return { ok: true, message: `Source removed (${existing.feedUrl}).` };
}

/**
 * Result wrapper for the dry-run feed test. The action returns BOTH a
 * status flag for the form (`ok`) and the raw `TestFeedResult` for the
 * UI to render the structured detail (sample items, headers, warnings).
 */
export interface TestFeedActionResult {
  ok: boolean;
  message?: string;
  detail?: TestFeedResult;
}

const TEST_FEED_RATE_WINDOW_MS = 60_000;
const TEST_FEED_RATE_MAX = 30;

/**
 * Run a non-persisting fetch + parse against either a stored source
 * (resolved by id) or a free-form URL the admin is about to save.
 *
 * Guards (defense in depth):
 *   1. `requireAdmin()` — caller must be a non-banned admin.
 *   2. zod-validated payload — exactly one of `sourceId` / `feedUrl`.
 *   3. Per-admin sliding-window rate limit (30/min) — caps how often
 *      a compromised admin token (or curious admin) can hammer the
 *      outbound network from our origin. `safeFetch` already enforces
 *      SSRF + size + time limits per request.
 *   4. If `sourceId` is provided we resolve the URL from the catalog
 *      so the admin can't substitute a different URL while pretending
 *      to test a known source (preserves audit-log fidelity).
 *
 * The action does NOT write any post or mutate health columns
 * (last_fetched_at / consecutive_failures) — that's the cron's job.
 * It does write a single `source.test` audit entry so we have a record
 * of who probed which URL when.
 */
export async function testFeedAction(
  _prev: TestFeedActionResult | null,
  formData: FormData,
): Promise<TestFeedActionResult> {
  const session = await requireAdmin();
  const parsed = TestFeedSchema.safeParse({
    feedUrl: (formData.get("feedUrl") as string) || undefined,
    sourceId: (formData.get("sourceId") as string) || undefined,
  });
  if (!parsed.success) {
    log.warn("admin_test_feed_invalid", {
      actor: session.user.userId,
      issues: parsed.error.issues.map((i) => i.message),
    });
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid test payload.",
    };
  }

  const limit = consumeSlidingLimit({
    key: `admin_test_feed:${session.user.userId}`,
    windowMs: TEST_FEED_RATE_WINDOW_MS,
    max: TEST_FEED_RATE_MAX,
  });
  if (!limit.allowed) {
    log.warn("admin_test_feed_rate_limited", {
      actor: session.user.userId,
      retryAfterMs: limit.retryAfterMs,
    });
    return {
      ok: false,
      message: `Too many tests — try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`,
    };
  }

  let urlToTest: string;
  let sourceIdAudit: string | null = null;
  if (parsed.data.sourceId) {
    const repo = getRepository();
    const existing = await repo.blogSources.getById(parsed.data.sourceId);
    if (!existing) {
      return { ok: false, message: "That source no longer exists." };
    }
    urlToTest = existing.feedUrl;
    sourceIdAudit = existing.id;
  } else {
    urlToTest = parsed.data.feedUrl as string;
  }

  const detail = await testFeed(urlToTest);
  const repo = getRepository();
  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: "source.test",
    targetType: "source",
    targetId: sourceIdAudit ?? `url:${urlToTest}`,
    payload: {
      feedUrl: urlToTest,
      ok: detail.ok,
      status: detail.status,
      itemCount: detail.itemCount,
      durationMs: detail.durationMs,
      error: detail.error,
    },
    occurredAt: nowIso(),
  });

  log.info("admin_test_feed", {
    actor: session.user.userId,
    feedUrl: urlToTest,
    sourceId: sourceIdAudit,
    ok: detail.ok,
    status: detail.status,
    itemCount: detail.itemCount,
    durationMs: detail.durationMs,
  });

  return {
    ok: detail.ok,
    message: detail.ok
      ? `Found ${detail.itemCount} item${detail.itemCount === 1 ? "" : "s"} in ${detail.durationMs}ms.`
      : (detail.error ?? "Feed test failed."),
    detail,
  };
}

/** Apply a moderation decision to a publisher suggestion. */
export async function decideSuggestionAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const parsed = SuggestionDecisionSchema.parse({
    suggestionId: formData.get("suggestionId"),
    decision: formData.get("decision"),
    reviewerNotes: (formData.get("reviewerNotes") as string) || null,
  });
  const repo = getRepository();
  const status =
    parsed.decision === "approve"
      ? "approved"
      : parsed.decision === "reject"
        ? "rejected"
        : "needs_changes";
  const updated = await repo.suggestions.decide(
    parsed.suggestionId,
    status,
    session.user.userId,
    parsed.reviewerNotes ?? null,
  );

  if (status === "approved") {
    const id = genId();
    await repo.publishers.upsert({
      id,
      type: updated.type,
      slug: slugify(updated.name),
      name: updated.name,
      websiteUrl: updated.websiteUrl,
      description: updated.reason,
      logoUrl: null,
      twitterHandle: null,
      githubHandle: null,
      homeCountry: null,
      defaultAccessLabel: updated.autoValidation?.inferredAccess ?? "free",
      defaultPaywallProvider: "unknown",
      isVerified: false,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    if (updated.feedUrl) {
      await repo.blogSources.upsert({
        id: genId(),
        publisherId: id,
        kind: updated.feedKind ?? "rss",
        feedUrl: updated.feedUrl,
        scrapeConfig: null,
        isActive: true,
        lastFetchedAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
        consecutiveFailures: 0,
        createdAt: nowIso(),
      });
    }
  }
  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: `suggestion.${status}`,
    targetType: "suggestion",
    targetId: parsed.suggestionId,
    payload: { reviewerNotes: parsed.reviewerNotes },
    occurredAt: nowIso(),
  });
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/publishers");
}

/**
 * Returned by the user-management actions so the calling form can render
 * a friendly explanation. We avoid `throw` for the safety guards because
 * Next.js Server Action error pages are noisy for routine "you can't do
 * that" messages — the action result + revalidate is a smoother UX.
 */
export interface UserAdminActionResult {
  ok: boolean;
  message?: string;
}

const UNAUTHORIZED_SELF_MUTATION =
  "You can't change your own role or ban status from this page. Ask another admin to make the change.";
const LAST_ADMIN_GUARD =
  "There must be at least one active admin. Promote another user before demoting or banning the last admin.";

/**
 * Promote a user to admin or demote them to a regular user.
 *
 * Safety guards (defense in depth — same checks would also live behind
 * Supabase RLS / DB triggers in production):
 *   1. Caller must be an authenticated, non-banned admin (`requireAdmin`).
 *   2. Caller cannot mutate their OWN row.
 *   3. Cannot demote the LAST remaining active admin.
 *   4. Target user must exist.
 *
 * Every change is written to `audit_log` with the before/after roles and
 * the actor's id, per the workspace logging-security rule.
 */
export async function setUserRoleAction(
  _prev: UserAdminActionResult | null,
  formData: FormData,
): Promise<UserAdminActionResult> {
  const session = await requireAdmin();
  const parsed = SetUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    log.warn("admin_set_user_role_invalid", {
      actor: session.user.userId,
      issues: parsed.error.issues.map((i) => i.message),
    });
    return { ok: false, message: "Invalid role payload." };
  }

  if (parsed.data.userId === session.user.userId) {
    log.warn("admin_set_user_role_self_blocked", { actor: session.user.userId });
    return { ok: false, message: UNAUTHORIZED_SELF_MUTATION };
  }

  const repo = getRepository();
  const target = await repo.profiles.getById(parsed.data.userId);
  if (!target) {
    return { ok: false, message: "That user no longer exists." };
  }
  if (target.role === parsed.data.role) {
    return { ok: true, message: `${target.email} is already ${parsed.data.role}.` };
  }

  if (target.role === "admin" && parsed.data.role === "user") {
    const admins = await repo.profiles.list({ role: "admin" });
    const otherActiveAdmins = admins.filter((p) => p.userId !== target.userId && !p.isBanned);
    if (otherActiveAdmins.length === 0) {
      log.warn("admin_set_user_role_last_admin_blocked", {
        actor: session.user.userId,
        target: target.userId,
      });
      return { ok: false, message: LAST_ADMIN_GUARD };
    }
  }

  await repo.profiles.setRole(target.userId, parsed.data.role);
  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: "user.role.update",
    targetType: "user",
    targetId: target.userId,
    payload: {
      from: target.role,
      to: parsed.data.role,
      targetEmail: target.email,
    },
    occurredAt: nowIso(),
  });
  log.info("admin_set_user_role", {
    actor: session.user.userId,
    target: target.userId,
    from: target.role,
    to: parsed.data.role,
  });
  revalidatePath("/admin/users");
  return {
    ok: true,
    message: `Updated ${target.email} → ${parsed.data.role}.`,
  };
}

/**
 * Ban or unban a user. A banned admin loses access to /admin/* (the
 * `requireAdmin` helper rejects banned admins). Regular banned users
 * can still browse public pages but their session will be denied at
 * `requireUser` for /me/* writes.
 *
 * Same safety guards as `setUserRoleAction` plus: banning an admin is
 * subject to the last-admin guard (because banning effectively removes
 * them from the admin pool).
 */
export async function setUserBannedAction(
  _prev: UserAdminActionResult | null,
  formData: FormData,
): Promise<UserAdminActionResult> {
  const session = await requireAdmin();
  const parsed = SetUserBannedSchema.safeParse({
    userId: formData.get("userId"),
    isBanned: formData.get("isBanned") === "true",
  });
  if (!parsed.success) {
    log.warn("admin_set_user_banned_invalid", {
      actor: session.user.userId,
      issues: parsed.error.issues.map((i) => i.message),
    });
    return { ok: false, message: "Invalid ban payload." };
  }

  if (parsed.data.userId === session.user.userId) {
    log.warn("admin_set_user_banned_self_blocked", { actor: session.user.userId });
    return { ok: false, message: UNAUTHORIZED_SELF_MUTATION };
  }

  const repo = getRepository();
  const target = await repo.profiles.getById(parsed.data.userId);
  if (!target) {
    return { ok: false, message: "That user no longer exists." };
  }
  if (target.isBanned === parsed.data.isBanned) {
    return {
      ok: true,
      message: `${target.email} is already ${parsed.data.isBanned ? "banned" : "active"}.`,
    };
  }

  if (parsed.data.isBanned && target.role === "admin") {
    const admins = await repo.profiles.list({ role: "admin" });
    const otherActiveAdmins = admins.filter((p) => p.userId !== target.userId && !p.isBanned);
    if (otherActiveAdmins.length === 0) {
      log.warn("admin_set_user_banned_last_admin_blocked", {
        actor: session.user.userId,
        target: target.userId,
      });
      return { ok: false, message: LAST_ADMIN_GUARD };
    }
  }

  await repo.profiles.setBanned(target.userId, parsed.data.isBanned);
  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: "user.ban.update",
    targetType: "user",
    targetId: target.userId,
    payload: {
      from: target.isBanned,
      to: parsed.data.isBanned,
      targetEmail: target.email,
      targetRole: target.role,
    },
    occurredAt: nowIso(),
  });
  log.info("admin_set_user_banned", {
    actor: session.user.userId,
    target: target.userId,
    from: target.isBanned,
    to: parsed.data.isBanned,
  });
  revalidatePath("/admin/users");
  return {
    ok: true,
    message: `${target.email} is now ${parsed.data.isBanned ? "banned" : "active"}.`,
  };
}
