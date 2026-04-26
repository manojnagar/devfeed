/**
 * @file Server Actions for the /me/* section.
 *
 * Each helper validates input, enforces auth, and performs a single
 * mutation. Using `revalidatePath` keeps the page in sync after a
 * mutation without a full client refresh.
 */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getRepository } from "@/lib/data";
import { DigestPreferencesInputSchema } from "@/lib/schemas";

const IdSchema = z.string().uuid().or(z.string().min(1));

/** Toggle a bookmark for the current user. */
export async function toggleBookmarkAction(formData: FormData): Promise<void> {
  const session = await requireUser();
  const postId = IdSchema.parse(formData.get("postId"));
  await getRepository().bookmarks.toggle(session.user.userId, postId);
  revalidatePath("/me/bookmarks");
}

/** Toggle a follow on a publisher. */
export async function togglePublisherFollowAction(formData: FormData): Promise<void> {
  const session = await requireUser();
  const publisherId = IdSchema.parse(formData.get("publisherId"));
  await getRepository().follows.togglePublisher(session.user.userId, publisherId);
  revalidatePath("/me/followed-publishers");
}

/** Toggle a follow on a tag. */
export async function toggleTagFollowAction(formData: FormData): Promise<void> {
  const session = await requireUser();
  const tagId = IdSchema.parse(formData.get("tagId"));
  await getRepository().follows.toggleTag(session.user.userId, tagId);
  revalidatePath("/me/followed-tags");
}

/** Persist updated digest preferences. */
export async function updateDigestPreferencesAction(formData: FormData): Promise<void> {
  const session = await requireUser();
  const accessLabels = formData.getAll("includeAccessLabels").map(String);
  const parsed = DigestPreferencesInputSchema.parse({
    frequency: formData.get("frequency"),
    preferredHourUtc: Number(formData.get("preferredHourUtc")),
    includeFollowedPublishers: formData.get("includeFollowedPublishers") === "on",
    includeFollowedTags: formData.get("includeFollowedTags") === "on",
    includeAccessLabels: accessLabels.length ? accessLabels : ["free"],
    maxPostsPerEmail: Number(formData.get("maxPostsPerEmail") ?? 12),
  });
  const repo = getRepository();
  const existing = await repo.digest.getPreferences(session.user.userId);
  await repo.digest.setPreferences({ ...existing, ...parsed, userId: session.user.userId });
  revalidatePath("/me/digest");
}
