/**
 * @file Dev-only background ingest for the in-memory store.
 *
 * Goal: make `/posts/[postId]` and the home feed feel like production
 * even in `npm run dev`, where the synthetic seed otherwise ships
 * fake article URLs that 404 on real publisher sites.
 *
 * Strategy (hybrid):
 *   1. Build the synthetic seed up front so the home page is never
 *      empty (instant boot).
 *   2. Schedule a real `runIngest` pass on first store read. It runs
 *      asynchronously so the first request is not blocked.
 *   3. After the ingest finishes, for each publisher whose feed
 *      succeeded, drop the synthetic posts that came from the seed —
 *      we now have real articles with real URLs from that publisher.
 *      Synthetic posts remain only for publishers whose feed was
 *      unreachable, so the feed gracefully degrades.
 *
 * This module is dev-only:
 *   - skipped when `process.env.NODE_ENV === 'test'` (Vitest mocks
 *     `safeFetch` and resets the store between cases — a real ingest
 *     here would flake CI).
 *   - skipped when `DEVFEED_LIVE_INGEST=false` (env opt-out so an
 *     offline dev environment can disable it).
 *   - never invoked when `STORAGE_ADAPTER=supabase` because there is
 *     no in-memory store in that case.
 *
 * Idempotent: only runs once per Node process. Failures never throw —
 * the home page must keep working even if the publisher is offline.
 */

import { log } from "../../log";
import type { MemoryStore } from "./store";
import type { IngestRunResult } from "../../ingest/run";

const SYNTHETIC_MARKER = "devseed=";
const STARTUP_DELAY_MS = 500;

let scheduled = false;
let ingestPromise: Promise<void> | null = null;

/**
 * Test/dev hook: await the in-flight live ingest if one was scheduled.
 * Returns immediately if no ingest is running.
 */
export function awaitLiveIngest(): Promise<void> {
  return ingestPromise ?? Promise.resolve();
}

/** Test-only: clear the once-flag so a new test can re-schedule. */
export function __resetLiveIngestForTests(): void {
  scheduled = false;
  ingestPromise = null;
}

/**
 * Schedule a single background ingest pass against the in-memory
 * store. Safe to call from anywhere — repeated calls after the first
 * one are no-ops within the same process.
 *
 * Returns the in-flight promise so callers that explicitly want to
 * await it (scripts, tests) can do so. Most callers should ignore it.
 */
export function scheduleLiveIngest(store: MemoryStore): Promise<void> {
  if (scheduled) return ingestPromise ?? Promise.resolve();
  if (process.env.NODE_ENV === "test") return Promise.resolve();
  if (process.env.DEVFEED_LIVE_INGEST === "false") return Promise.resolve();
  scheduled = true;

  ingestPromise = (async () => {
    await new Promise((r) => setTimeout(r, STARTUP_DELAY_MS));
    log.info("dev_live_ingest_starting", {
      sources: store.blogSources.size,
    });
    try {
      // Dynamic import — `runIngest` transitively re-imports the
      // memory store, so loading it eagerly here would create a
      // module init cycle. Importing inside the async closure
      // defers the resolution until after `store.ts` has fully
      // initialized.
      const { runIngest } = await import("../../ingest/run");
      const result = await runIngest();
      const succeededSourceIds = collectSucceededSources(store, result);
      const removed = removeSyntheticPostsForSources(store, succeededSourceIds);
      log.info("dev_live_ingest_complete", {
        sourcesProcessed: result.sourcesProcessed,
        sourcesFailed: result.sourcesFailed,
        postsInserted: result.postsInserted,
        bodiesFromFeed: result.bodiesFromFeed,
        syntheticPostsRemoved: removed,
      });
    } catch (err) {
      log.warn("dev_live_ingest_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
  return ingestPromise;
}

/**
 * Collect source ids whose feed succeeded in the most recent ingest.
 * A source counts as succeeded when `lastFetchedAt` is non-null and
 * is at least as recent as `lastErrorAt`. Combining both gives us a
 * truthful answer even if a source has historical failures.
 */
function collectSucceededSources(
  store: MemoryStore,
  _result: IngestRunResult,
): Set<string> {
  const succeeded = new Set<string>();
  for (const src of store.blogSources.values()) {
    if (!src.lastFetchedAt) continue;
    const fetched = new Date(src.lastFetchedAt).getTime();
    const errored = src.lastErrorAt ? new Date(src.lastErrorAt).getTime() : 0;
    if (Number.isFinite(fetched) && fetched >= errored) {
      succeeded.add(src.id);
    }
  }
  return succeeded;
}

/**
 * Drop synthetic seed posts from the given sources.
 *
 * "Synthetic" is identified by the `devseed=` query string the seed
 * builder writes into `canonicalUrl`. Real ingested posts use the
 * publisher's actual article URL and never carry that marker.
 *
 * Cleans up the dependent rows (`postTags`, `bookmarks`, `readEvents`)
 * to keep referential integrity within the in-memory store.
 */
function removeSyntheticPostsForSources(
  store: MemoryStore,
  sourceIds: Set<string>,
): number {
  if (sourceIds.size === 0) return 0;
  let removed = 0;
  const removedIds = new Set<string>();
  for (const [id, post] of store.posts) {
    if (!post.canonicalUrl.includes(SYNTHETIC_MARKER)) continue;
    if (!sourceIds.has(post.sourceId)) continue;
    removedIds.add(id);
  }
  for (const id of removedIds) {
    store.posts.delete(id);
    removed += 1;
  }
  if (removed > 0) {
    store.postTags = store.postTags.filter((pt) => !removedIds.has(pt.postId));
    store.bookmarks = store.bookmarks.filter((bm) => !removedIds.has(bm.postId));
    store.readEvents = store.readEvents.filter((re) => !removedIds.has(re.postId));
  }
  return removed;
}
