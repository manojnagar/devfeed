/**
 * @file In-memory BlogSourceRepository implementation.
 *
 * Mirrors the production Postgres semantics (see
 * `supabase/migrations/0002_core_tables.sql`):
 *  - `(publisher_id, feed_url)` is unique — `update` enforces it client-side.
 *  - Deleting a source cascades to posts in production. The in-memory
 *    adapter mirrors that to keep dev-mode parity with prod (so the
 *    admin can preview the destructive blast radius before shipping).
 */

import type { BlogSourceRepository } from "../../types";
import { getMemoryStore } from "../store";

function listAll() {
  return Array.from(getMemoryStore().blogSources.values());
}

export const memoryBlogSourceRepo: BlogSourceRepository = {
  async listByPublisher(publisherId) {
    return listAll().filter((s) => s.publisherId === publisherId);
  },
  async listActive() {
    return listAll().filter((s) => s.isActive);
  },
  async list({ isActive }: { isActive?: boolean } = {}) {
    const all = listAll();
    if (typeof isActive === "boolean") return all.filter((s) => s.isActive === isActive);
    return all;
  },
  async getById(id) {
    return getMemoryStore().blogSources.get(id) ?? null;
  },
  async upsert(source) {
    getMemoryStore().blogSources.set(source.id, source);
    return source;
  },
  async update(id, patch) {
    const store = getMemoryStore();
    const existing = store.blogSources.get(id);
    if (!existing) {
      throw new Error(`blog source ${id} not found`);
    }
    const conflict = listAll().find(
      (s) =>
        s.id !== id &&
        s.publisherId === patch.publisherId &&
        s.feedUrl === patch.feedUrl,
    );
    if (conflict) {
      throw new Error("DUPLICATE_FEED_URL");
    }
    const next = {
      ...existing,
      publisherId: patch.publisherId,
      feedUrl: patch.feedUrl,
      kind: patch.kind,
    };
    store.blogSources.set(id, next);
    return next;
  },
  async setActive(id, isActive) {
    const store = getMemoryStore();
    const existing = store.blogSources.get(id);
    if (!existing) return;
    store.blogSources.set(id, { ...existing, isActive });
  },
  async delete(id) {
    const store = getMemoryStore();
    if (!store.blogSources.has(id)) return;
    store.blogSources.delete(id);
    const removedPostIds = new Set<string>();
    for (const post of Array.from(store.posts.values())) {
      if (post.sourceId === id) {
        removedPostIds.add(post.id);
        store.posts.delete(post.id);
      }
    }
    if (removedPostIds.size > 0) {
      store.postTags = store.postTags.filter((pt) => !removedPostIds.has(pt.postId));
    }
  },
  async recordSuccess(sourceId, fetchedAt) {
    const store = getMemoryStore();
    const existing = store.blogSources.get(sourceId);
    if (!existing) return;
    store.blogSources.set(sourceId, {
      ...existing,
      lastFetchedAt: fetchedAt,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
    });
  },
  async recordFailure(sourceId, message, occurredAt) {
    const store = getMemoryStore();
    const existing = store.blogSources.get(sourceId);
    if (!existing) return;
    store.blogSources.set(sourceId, {
      ...existing,
      lastErrorAt: occurredAt,
      lastErrorMessage: message,
      consecutiveFailures: existing.consecutiveFailures + 1,
    });
  },
};
