/**
 * @file In-memory singleton store for dev mode + tests.
 *
 * The store survives for the lifetime of the Node process (dev server,
 * test run). All mutations go through the `MemoryRepository`; nothing
 * else should touch the maps directly.
 *
 * Tests can reset the store between runs via `resetMemoryStore()`.
 */

import type {
  AuditLog,
  BlogSource,
  Bookmark,
  DigestPreferences,
  FollowedPublisher,
  FollowedTag,
  Post,
  PostTag,
  Profile,
  Publisher,
  PublisherSuggestion,
  ReadEvent,
  Tag,
} from "../../types";
import { buildSeed } from "../seed/build";
import { scheduleLiveIngest } from "./live-ingest";

export interface MemoryStore {
  publishers: Map<string, Publisher>;
  blogSources: Map<string, BlogSource>;
  posts: Map<string, Post>;
  postTags: PostTag[];
  tags: Map<string, Tag>;
  profiles: Map<string, Profile>;
  bookmarks: Bookmark[];
  followedPublishers: FollowedPublisher[];
  followedTags: FollowedTag[];
  digestPreferences: Map<string, DigestPreferences>;
  suggestions: Map<string, PublisherSuggestion>;
  readEvents: ReadEvent[];
  auditLog: AuditLog[];
}

let cached: MemoryStore | null = null;

function buildStore(): MemoryStore {
  const seed = buildSeed();
  const store: MemoryStore = {
    publishers: new Map(seed.publishers.map((p) => [p.id, p])),
    blogSources: new Map(seed.blogSources.map((s) => [s.id, s])),
    posts: new Map(seed.posts.map((p) => [p.id, p])),
    postTags: [...seed.postTags],
    tags: new Map(seed.tags.map((t) => [t.id, t])),
    profiles: new Map(seed.profiles.map((p) => [p.userId, p])),
    bookmarks: [],
    followedPublishers: [],
    followedTags: [],
    digestPreferences: new Map(),
    suggestions: new Map(),
    readEvents: [],
    auditLog: [],
  };
  return store;
}

/**
 * Get (and lazily build) the singleton store.
 *
 * Called by the in-memory repository on every operation. Cheap after
 * the first call. On the very first call we kick off a dev-only
 * background ingest pass against the seeded RSS feeds so the home
 * page can graduate from synthetic seed data to real article URLs
 * (see `live-ingest.ts`). The ingest is async and never blocks here;
 * if it fails or is disabled, callers still get the synthetic seed.
 */
export function getMemoryStore(): MemoryStore {
  if (!cached) {
    cached = buildStore();
    void scheduleLiveIngest(cached);
  }
  return cached;
}

/** Reset the store to a fresh seed. Test-only. */
export function resetMemoryStore(): void {
  cached = null;
}
