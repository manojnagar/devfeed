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
  async delete(id) {
    getMemoryStore().publishers.delete(id);
  },
};

export const __testHelpers = {
  publisherTypes: ["company", "person"] as PublisherType[],
};
