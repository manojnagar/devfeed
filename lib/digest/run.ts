/**
 * @file Digest send orchestrator.
 *
 * For every recipient whose preferences match the current hour, select
 * matching posts, render the digest email, and send it through the
 * configured email adapter. Records `lastSentAt` after success.
 */

import { getRepository } from "../data";
import { getEmail } from "../email";
import { renderDigestEmail } from "../email/templates/digest";
import { selectDigestPosts } from "./select";
import { createUnsubscribeToken } from "./unsubscribe-token";
import { getEnv } from "../env";
import { genId } from "../ids";
import { nowIso } from "../dates";
import { log } from "../log";

export interface DigestRunResult {
  sent: number;
  skipped: number;
  failed: number;
  startedAt: string;
  finishedAt: string;
}

/** Run a single digest pass for the current UTC hour. */
export async function runDigest(now: Date = new Date()): Promise<DigestRunResult> {
  const repo = getRepository();
  const email = getEmail();
  const env = getEnv();
  const startedAt = nowIso();
  const recipients = await repo.digest.selectRecipients(now);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const prefs of recipients) {
    const profile = await repo.profiles.getById(prefs.userId);
    if (!profile || profile.isBanned) {
      skipped += 1;
      continue;
    }
    const since = new Date(now.getTime() - (prefs.frequency === "weekly" ? 7 : 1) * 86_400_000);
    const followedPublishers = await repo.follows.listFollowedPublishers(profile.userId);
    const followedTags = await repo.follows.listFollowedTags(profile.userId);
    const candidates = await repo.posts.list({ pageSize: 200 });
    const posts = selectDigestPosts({
      preferences: prefs,
      candidates: candidates.items,
      followedPublisherIds: followedPublishers.map((p) => p.id),
      followedTagIds: followedTags.map((t) => t.id),
      since,
    });
    if (posts.length === 0) {
      skipped += 1;
      continue;
    }
    const unsubscribeToken = createUnsubscribeToken(profile.userId);
    const rendered = renderDigestEmail({
      recipientEmail: profile.email,
      recipientName: profile.displayName,
      frequency: prefs.frequency === "weekly" ? "weekly" : "daily",
      posts,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
      unsubscribeUrl: `${env.NEXT_PUBLIC_SITE_URL}/api/digest/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`,
    });
    try {
      const result = await email.send({
        to: { email: profile.email, name: profile.displayName ?? undefined },
        rendered,
        tag: "digest",
      });
      if ("error" in result) throw new Error(result.error);
      await repo.digest.recordSent(profile.userId, nowIso(), posts.map((p) => p.id));
      sent += 1;
    } catch (err) {
      failed += 1;
      log.warn("digest_send_failed", {
        userId: profile.userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await repo.audit.insert({
    id: genId(),
    actorUserId: null,
    action: "digest.run",
    targetType: "digest",
    targetId: "global",
    payload: { sent, skipped, failed },
    occurredAt: nowIso(),
  });

  return { sent, skipped, failed, startedAt, finishedAt: nowIso() };
}
