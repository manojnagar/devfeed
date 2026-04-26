/**
 * @file In-memory BlogSourceRepository implementation.
 */

import type { BlogSourceRepository } from "../../types";
import { getMemoryStore } from "../store";

export const memoryBlogSourceRepo: BlogSourceRepository = {
  async listByPublisher(publisherId) {
    return Array.from(getMemoryStore().blogSources.values()).filter(
      (s) => s.publisherId === publisherId,
    );
  },
  async listActive() {
    return Array.from(getMemoryStore().blogSources.values()).filter((s) => s.isActive);
  },
  async upsert(source) {
    getMemoryStore().blogSources.set(source.id, source);
    return source;
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
