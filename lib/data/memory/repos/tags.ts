/**
 * @file In-memory TagRepository implementation.
 */

import type { Tag } from "../../../types";
import type { TagRepository } from "../../types";
import { getMemoryStore } from "../store";
import { TAG_SEEDS } from "../../seed/tags";

export const memoryTagRepo: TagRepository = {
  async list({ featuredOnly = false } = {}) {
    const all = Array.from(getMemoryStore().tags.values());
    return all
      .filter((t) => (featuredOnly ? t.isFeatured : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
  async getBySlug(slug) {
    for (const t of getMemoryStore().tags.values()) {
      if (t.slug === slug) return t;
    }
    return null;
  },
  async upsertMany(tags: Tag[]) {
    const store = getMemoryStore();
    for (const t of tags) store.tags.set(t.id, t);
    return tags;
  },
  async matchByKeywords(text) {
    const lower = text.toLowerCase();
    const store = getMemoryStore();
    const out: Tag[] = [];
    for (const seed of TAG_SEEDS) {
      if (seed.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
        const tag = Array.from(store.tags.values()).find((t) => t.slug === seed.slug);
        if (tag) out.push(tag);
      }
    }
    return out;
  },
  async merge(sourceId, targetId) {
    const store = getMemoryStore();
    if (sourceId === targetId) return;
    store.postTags = store.postTags.map((pt) =>
      pt.tagId === sourceId ? { ...pt, tagId: targetId } : pt,
    );
    store.tags.delete(sourceId);
  },
};
