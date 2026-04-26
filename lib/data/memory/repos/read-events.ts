/**
 * @file In-memory ReadEventRepository + AuditRepository.
 */

import type { AccessLabel } from "../../../types";
import type { AuditRepository, ReadEventRepository } from "../../types";
import { getMemoryStore } from "../store";

export const memoryReadEventRepo: ReadEventRepository = {
  async insert(event) {
    getMemoryStore().readEvents.push(event);
  },
  async countTotal() {
    return getMemoryStore().readEvents.length;
  },
  async countByDay(days) {
    const cutoff = Date.now() - days * 86_400_000;
    const buckets = new Map<string, number>();
    for (const ev of getMemoryStore().readEvents) {
      const t = new Date(ev.occurredAt).getTime();
      if (t < cutoff) continue;
      const day = ev.occurredAt.slice(0, 10);
      buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  },
  async countByPublisher(days, limit) {
    const store = getMemoryStore();
    const cutoff = Date.now() - days * 86_400_000;
    const counts = new Map<string, number>();
    for (const ev of store.readEvents) {
      if (new Date(ev.occurredAt).getTime() < cutoff) continue;
      const post = store.posts.get(ev.postId);
      if (!post) continue;
      counts.set(post.publisherId, (counts.get(post.publisherId) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([publisherId, count]) => ({ publisherId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
  async countByAccess(days) {
    const store = getMemoryStore();
    const cutoff = Date.now() - days * 86_400_000;
    const counts = new Map<AccessLabel, number>();
    for (const ev of store.readEvents) {
      if (new Date(ev.occurredAt).getTime() < cutoff) continue;
      const post = store.posts.get(ev.postId);
      if (!post) continue;
      counts.set(post.accessLabel, (counts.get(post.accessLabel) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([accessLabel, count]) => ({ accessLabel, count }));
  },
};

export const memoryAuditRepo: AuditRepository = {
  async insert(entry) {
    getMemoryStore().auditLog.push(entry);
  },
  async list(limit) {
    return getMemoryStore()
      .auditLog.slice(-limit)
      .reverse();
  },
};
