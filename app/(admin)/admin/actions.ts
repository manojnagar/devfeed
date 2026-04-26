/**
 * @file Server Actions for the /admin/* pages.
 */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import {
  PublisherTypeEnum,
  SuggestionDecisionSchema,
  AccessLabelEnum,
  SourceKindEnum,
  UrlSchema,
  SlugSchema,
} from "@/lib/schemas";
import { genId, slugify } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import { log } from "@/lib/log";

const PublisherUpsertSchema = z.object({
  id: z.string().optional(),
  type: PublisherTypeEnum,
  name: z.string().trim().min(2).max(120),
  slug: SlugSchema.optional(),
  websiteUrl: UrlSchema,
  description: z.string().trim().max(500).optional().nullable(),
  defaultAccessLabel: AccessLabelEnum.default("free"),
  twitterHandle: z.string().trim().max(50).optional().nullable(),
  githubHandle: z.string().trim().max(50).optional().nullable(),
});

/** Create or update a publisher (admin only). */
export async function upsertPublisherAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const parsed = PublisherUpsertSchema.parse({
    id: formData.get("id") || undefined,
    type: formData.get("type"),
    name: formData.get("name"),
    slug: (formData.get("slug") as string) || undefined,
    websiteUrl: formData.get("websiteUrl"),
    description: formData.get("description") || null,
    defaultAccessLabel: (formData.get("defaultAccessLabel") as string) || "free",
    twitterHandle: (formData.get("twitterHandle") as string) || null,
    githubHandle: (formData.get("githubHandle") as string) || null,
  });
  const repo = getRepository();
  const id = parsed.id ?? genId();
  const slug = parsed.slug ?? slugify(parsed.name);
  await repo.publishers.upsert({
    id,
    type: parsed.type,
    slug,
    name: parsed.name,
    websiteUrl: parsed.websiteUrl,
    description: parsed.description ?? null,
    logoUrl: null,
    twitterHandle: parsed.twitterHandle ?? null,
    githubHandle: parsed.githubHandle ?? null,
    homeCountry: null,
    defaultAccessLabel: parsed.defaultAccessLabel,
    defaultPaywallProvider: "unknown",
    isVerified: false,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  await repo.audit.insert({
    id: genId(),
    actorUserId: session.user.userId,
    action: parsed.id ? "publisher.update" : "publisher.create",
    targetType: "publisher",
    targetId: id,
    payload: { name: parsed.name, slug, type: parsed.type },
    occurredAt: nowIso(),
  });
  log.info("admin_publisher_upserted", { id, slug, actor: session.user.userId });
  revalidatePath("/admin/publishers");
  revalidatePath("/publishers");
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
