/**
 * @file Ingestion orchestrator.
 *
 * Walks every active blog source, fetches its feed, parses items,
 * canonicalizes URLs, dedupes against the existing posts, auto-tags,
 * detects access labels, and writes the survivors to the repository.
 *
 * Returns a structured summary so the cron route + admin "Trigger
 * fetch now" button can show results without the caller having to
 * re-query the database.
 */

import { canonicalizeUrl } from "../url";
import { getRepository } from "../data";
import { genId, shortHash } from "../ids";
import { nowIso } from "../dates";
import { log } from "../log";
import { autoTag } from "./auto-tag";
import { detectAccess } from "./detect-access";
import { parseFeed, type ParsedFeedItem } from "./parse-feed";
import { safeFetch, UnsafeUrlError } from "./safe-fetch";
import type { Post, Publisher, Tag } from "../types";

export interface IngestRunResult {
  startedAt: string;
  finishedAt: string;
  sourcesProcessed: number;
  sourcesFailed: number;
  postsInserted: number;
  errors: Array<{ sourceId: string; message: string }>;
}

interface PreparedPost {
  post: Post;
  tagSlugs: string[];
}

/** Normalize a parsed feed item into a Post + tag list ready for insert. */
function prepareItem(
  item: ParsedFeedItem,
  publisher: Publisher,
  sourceId: string,
): PreparedPost | null {
  if (!item.title || !item.link) return null;
  const canonical = canonicalizeUrl(item.link);
  const access = detectAccess({
    postUrl: item.link,
    publisherDefault: publisher.defaultAccessLabel,
    publisherDefaultProvider: publisher.defaultPaywallProvider,
    bodyHints: item.summary ?? "",
  });
  const tags = autoTag({ title: item.title, summary: item.summary });
  const post: Post = {
    id: `post-${shortHash(`${publisher.id}:${canonical}`)}`,
    publisherId: publisher.id,
    sourceId,
    title: item.title,
    summary: item.summary,
    url: item.link,
    canonicalUrl: canonical,
    authorName: item.author ?? (publisher.type === "person" ? publisher.name : null),
    publishedAt: item.publishedAt,
    readingTimeMin: estimateReadingTime(item.summary ?? ""),
    accessLabel: access.accessLabel,
    paywallProvider: access.paywallProvider,
    thumbnailUrl: null,
    rawContentHash: shortHash(item.summary ?? item.link),
    createdAt: nowIso(),
  };
  return { post, tagSlugs: tags.slugs };
}

function estimateReadingTime(summary: string): number | null {
  const wordCount = summary.split(/\s+/).filter(Boolean).length;
  if (wordCount < 20) return null;
  return Math.max(1, Math.round((wordCount * 4) / 200));
}

async function attachTagsForPosts(
  prepared: PreparedPost[],
  tagsBySlug: Map<string, Tag>,
): Promise<void> {
  const repo = getRepository();
  for (const { post, tagSlugs } of prepared) {
    const ids = tagSlugs.map((s) => tagsBySlug.get(s)?.id).filter((v): v is string => Boolean(v));
    if (ids.length > 0) await repo.posts.attachTags(post.id, ids);
  }
}

/**
 * Run a single ingest pass against all active sources.
 *
 * Concurrency is intentionally sequential here for clarity. The cron
 * route can swap in p-limit if throughput becomes an issue.
 */
export async function runIngest(): Promise<IngestRunResult> {
  const repo = getRepository();
  const startedAt = nowIso();
  const sources = await repo.blogSources.listActive();
  const allTags = await repo.tags.list();
  const tagsBySlug = new Map(allTags.map((t) => [t.slug, t] as const));
  const errors: IngestRunResult["errors"] = [];
  let inserted = 0;
  let processed = 0;
  let failed = 0;

  for (const source of sources) {
    const publisher = await repo.publishers.getById(source.publisherId);
    if (!publisher) continue;
    try {
      const fetched = await safeFetch(source.feedUrl);
      const parsed = parseFeed(fetched.body);
      const prepared = parsed.items
        .map((item) => prepareItem(item, publisher, source.id))
        .filter((p): p is PreparedPost => p !== null);
      if (prepared.length > 0) {
        const insertedCount = await repo.posts.insertMany(prepared.map((p) => p.post));
        inserted += insertedCount;
        await attachTagsForPosts(prepared, tagsBySlug);
      }
      await repo.blogSources.recordSuccess(source.id, nowIso());
      processed += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ sourceId: source.id, message });
      await repo.blogSources.recordFailure(source.id, message, nowIso());
      log.warn("ingest_source_failed", {
        sourceId: source.id,
        publisherId: source.publisherId,
        error: message,
        kind: err instanceof UnsafeUrlError ? "unsafe_url" : "fetch_or_parse",
      });
    }
  }

  await repo.audit.insert({
    id: genId(),
    actorUserId: null,
    action: "ingest.run",
    targetType: "ingest",
    targetId: "global",
    payload: { processed, failed, inserted, sourceCount: sources.length },
    occurredAt: nowIso(),
  });

  return {
    startedAt,
    finishedAt: nowIso(),
    sourcesProcessed: processed,
    sourcesFailed: failed,
    postsInserted: inserted,
    errors,
  };
}
