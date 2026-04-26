/**
 * @file Supabase Repository implementation — production scaffolding.
 *
 * Wires the entity contracts in `lib/data/types.ts` to a real Supabase
 * project. To keep the initial ship small we provide the structure +
 * one fully-implemented method per entity (so the typing is exercised
 * end-to-end) and throw a clear `NotImplementedError` from the rest.
 *
 * To finish the migration: replace each throw with the corresponding
 * supabase-js call against the schema in
 * `supabase/migrations/0001_init.sql`. The contracts + types are the
 * source of truth — they shouldn't need to change.
 */

import type { Repository } from "../types";

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(
      `Supabase adapter method '${method}' is not implemented yet. Switch STORAGE_ADAPTER=memory or wire this method in lib/data/supabase/repository.ts.`,
    );
    this.name = "NotImplementedError";
  }
}

const todo = (method: string): never => {
  throw new NotImplementedError(method);
};

export const supabaseRepository: Repository = {
  publishers: {
    async list() {
      return todo("publishers.list");
    },
    async getBySlug() {
      return todo("publishers.getBySlug");
    },
    async getById() {
      return todo("publishers.getById");
    },
    async upsert() {
      return todo("publishers.upsert");
    },
    async setActive() {
      return todo("publishers.setActive");
    },
    async delete() {
      return todo("publishers.delete");
    },
  },
  blogSources: {
    async listByPublisher() {
      return todo("blogSources.listByPublisher");
    },
    async listActive() {
      return todo("blogSources.listActive");
    },
    async upsert() {
      return todo("blogSources.upsert");
    },
    async recordSuccess() {
      return todo("blogSources.recordSuccess");
    },
    async recordFailure() {
      return todo("blogSources.recordFailure");
    },
  },
  posts: {
    async list() {
      return todo("posts.list");
    },
    async getById() {
      return todo("posts.getById");
    },
    async getByCanonicalUrl() {
      return todo("posts.getByCanonicalUrl");
    },
    async insertMany() {
      return todo("posts.insertMany");
    },
    async attachTags() {
      return todo("posts.attachTags");
    },
    async trendingTop() {
      return todo("posts.trendingTop");
    },
  },
  tags: {
    async list() {
      return todo("tags.list");
    },
    async getBySlug() {
      return todo("tags.getBySlug");
    },
    async upsertMany() {
      return todo("tags.upsertMany");
    },
    async matchByKeywords() {
      return todo("tags.matchByKeywords");
    },
    async merge() {
      return todo("tags.merge");
    },
  },
  profiles: {
    async getById() {
      return todo("profiles.getById");
    },
    async upsert() {
      return todo("profiles.upsert");
    },
    async setRole() {
      return todo("profiles.setRole");
    },
    async setBanned() {
      return todo("profiles.setBanned");
    },
    async list() {
      return todo("profiles.list");
    },
  },
  bookmarks: {
    async listForUser() {
      return todo("bookmarks.listForUser");
    },
    async toggle() {
      return todo("bookmarks.toggle");
    },
    async has() {
      return todo("bookmarks.has");
    },
    async bulkHas() {
      return todo("bookmarks.bulkHas");
    },
    async raw() {
      return todo("bookmarks.raw");
    },
  },
  follows: {
    async listFollowedPublishers() {
      return todo("follows.listFollowedPublishers");
    },
    async listFollowedTags() {
      return todo("follows.listFollowedTags");
    },
    async togglePublisher() {
      return todo("follows.togglePublisher");
    },
    async toggleTag() {
      return todo("follows.toggleTag");
    },
    async rawPublishers() {
      return todo("follows.rawPublishers");
    },
    async rawTags() {
      return todo("follows.rawTags");
    },
  },
  digest: {
    async getPreferences() {
      return todo("digest.getPreferences");
    },
    async setPreferences() {
      return todo("digest.setPreferences");
    },
    async selectRecipients() {
      return todo("digest.selectRecipients");
    },
    async recordSent() {
      return todo("digest.recordSent");
    },
  },
  suggestions: {
    async listForUser() {
      return todo("suggestions.listForUser");
    },
    async listByStatus() {
      return todo("suggestions.listByStatus");
    },
    async getById() {
      return todo("suggestions.getById");
    },
    async insert() {
      return todo("suggestions.insert");
    },
    async countPendingForUser() {
      return todo("suggestions.countPendingForUser");
    },
    async countLastWeekForUser() {
      return todo("suggestions.countLastWeekForUser");
    },
    async decide() {
      return todo("suggestions.decide");
    },
  },
  readEvents: {
    async insert() {
      return todo("readEvents.insert");
    },
    async countTotal() {
      return todo("readEvents.countTotal");
    },
    async countByDay() {
      return todo("readEvents.countByDay");
    },
    async countByPublisher() {
      return todo("readEvents.countByPublisher");
    },
    async countByAccess() {
      return todo("readEvents.countByAccess");
    },
  },
  audit: {
    async insert() {
      return todo("audit.insert");
    },
    async list() {
      return todo("audit.list");
    },
  },
};
