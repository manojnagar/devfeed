/**
 * @file In-memory PublisherRepository implementation.
 */

import type { Publisher, PublisherType } from "../../../types";
import type { PublisherRepository } from "../../types";
import { getMemoryStore } from "../store";

export const memoryPublisherRepo: PublisherRepository = {
  async list({ type, isActive } = {}) {
    const all = Array.from(getMemoryStore().publishers.values());
    return all
      .filter((p) => (type ? type.includes(p.type) : true))
      .filter((p) => (isActive == null ? true : p.isActive === isActive))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  async getBySlug(slug) {
    for (const p of getMemoryStore().publishers.values()) {
      if (p.slug === slug) return p;
    }
    return null;
  },
  async getById(id) {
    return getMemoryStore().publishers.get(id) ?? null;
  },
  async upsert(publisher: Publisher) {
    getMemoryStore().publishers.set(publisher.id, publisher);
    return publisher;
  },
  async setActive(id, isActive) {
    const store = getMemoryStore();
    const existing = store.publishers.get(id);
    if (existing) {
      store.publishers.set(id, { ...existing, isActive, updatedAt: new Date().toISOString() });
    }
  },
  /**
   * Delete a publisher and cascade to dependent rows — mirroring the
   * `on delete cascade` foreign keys in the SQL schema (see migrations
   * `0002_core_tables.sql` + `0003_user_tables.sql`):
   *   posts          → cascade
   *   post_tags      → cascade via posts
   *   bookmarks      → cascade via posts
   *   read_events    → cascade via posts
   *   blog_sources   → cascade
   *   follow_pubs    → cascade
   *
   * Audit log + suggestions intentionally do NOT cascade: they preserve
   * a forensic record of what was deleted. Kept-around suggestions
   * still resolve to a removed publisher slug, which is fine.
   */
  async delete(id) {
    const store = getMemoryStore();
    if (!store.publishers.has(id)) return;
    store.publishers.delete(id);

    const removedPostIds = new Set<string>();
    for (const post of Array.from(store.posts.values())) {
      if (post.publisherId === id) {
        removedPostIds.add(post.id);
        store.posts.delete(post.id);
      }
    }
    if (removedPostIds.size > 0) {
      store.postTags = store.postTags.filter((pt) => !removedPostIds.has(pt.postId));
      store.bookmarks = store.bookmarks.filter((b) => !removedPostIds.has(b.postId));
      store.readEvents = store.readEvents.filter((r) => !removedPostIds.has(r.postId));
    }

    for (const src of Array.from(store.blogSources.values())) {
      if (src.publisherId === id) store.blogSources.delete(src.id);
    }
    store.followedPublishers = store.followedPublishers.filter((f) => f.publisherId !== id);
  },
};

export const __testHelpers = {
  publisherTypes: ["company", "person"] as PublisherType[],
};
