/**
 * @file In-memory PostRepository implementation.
 *
 * The list query reproduces the behaviour the Supabase adapter will
 * eventually delegate to Postgres: filter by publisher type, publisher
 * id, tag id, access label, free-text search, and time range. Results
 * are sorted by `publishedAt` descending unless `sort=trending` is
 * passed.
 */

import type { Post, PostWithRelations, Publisher, Tag } from "../../../types";
import type {
  ListPostsOptions,
  PostRepository,
  SetPostBodyFailedInput,
  SetPostBodyInput,
} from "../../types";
import { getMemoryStore } from "../store";

const DEFAULT_PAGE_SIZE = 20;

function hydrate(
  post: Post,
  publishers: Map<string, Publisher>,
  postTags: { postId: string; tagId: string }[],
  tags: Map<string, Tag>,
): PostWithRelations | null {
  const publisher = publishers.get(post.publisherId);
  if (!publisher) return null;
  const ptags = postTags
    .filter((pt) => pt.postId === post.id)
    .map((pt) => tags.get(pt.tagId))
    .filter((t): t is Tag => Boolean(t));
  return { ...post, publisher, tags: ptags };
}

function matchesFilters(
  post: PostWithRelations,
  options: ListPostsOptions,
  followedPublisherIds: string[],
  followedTagIds: string[],
): boolean {
  if (options.type && options.type.length > 0 && !options.type.includes(post.publisher.type)) {
    return false;
  }
  if (options.publisher && options.publisher.length > 0) {
    if (!options.publisher.includes(post.publisher.slug)) return false;
  }
  if (options.tag && options.tag.length > 0) {
    const tagSlugs = post.tags.map((t) => t.slug);
    if (!options.tag.some((slug) => tagSlugs.includes(slug))) return false;
  }
  if (options.access && options.access.length > 0) {
    if (!options.access.includes(post.accessLabel)) return false;
  }
  if (options.from instanceof Date) {
    if (new Date(post.publishedAt).getTime() < options.from.getTime()) return false;
  }
  if (options.q) {
    const needle = options.q.toLowerCase();
    const haystack = `${post.title} ${post.summary ?? ""}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  if (followedPublisherIds.length > 0 || followedTagIds.length > 0) {
    const matchesPublisher =
      followedPublisherIds.length > 0 && followedPublisherIds.includes(post.publisherId);
    const matchesTag =
      followedTagIds.length > 0 && post.tags.some((t) => followedTagIds.includes(t.id));
    if (!matchesPublisher && !matchesTag) return false;
  }
  return true;
}

export const memoryPostRepo: PostRepository = {
  async list(options: ListPostsOptions) {
    const store = getMemoryStore();
    const hydrated = Array.from(store.posts.values())
      .map((p) => hydrate(p, store.publishers, store.postTags, store.tags))
      .filter((p): p is PostWithRelations => p !== null);

    const filtered = hydrated.filter((p) =>
      matchesFilters(
        p,
        options,
        options.followedPublisherIds ?? [],
        options.followedTagIds ?? [],
      ),
    );

    const sorted =
      options.sort === "trending"
        ? sortByTrending(filtered, store.readEvents)
        : filtered.sort(
            (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
          );

    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const page = options.page ?? 1;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    return { items, total: sorted.length, page, pageSize };
  },

  async getById(id) {
    const store = getMemoryStore();
    const raw = store.posts.get(id);
    if (!raw) return null;
    return hydrate(raw, store.publishers, store.postTags, store.tags);
  },

  async getByCanonicalUrl(canonicalUrl) {
    for (const p of getMemoryStore().posts.values()) {
      if (p.canonicalUrl === canonicalUrl) return p;
    }
    return null;
  },

  async insertMany(posts) {
    const store = getMemoryStore();
    let inserted = 0;
    for (const p of posts) {
      if (!store.posts.has(p.id)) {
        store.posts.set(p.id, p);
        inserted += 1;
      }
    }
    return inserted;
  },

  async attachTags(postId, tagIds) {
    const store = getMemoryStore();
    const existing = new Set(
      store.postTags.filter((pt) => pt.postId === postId).map((pt) => pt.tagId),
    );
    for (const tagId of tagIds) {
      if (!existing.has(tagId)) {
        store.postTags.push({ postId, tagId });
      }
    }
  },

  async trendingTop(limit, days) {
    const store = getMemoryStore();
    const cutoff = Date.now() - days * 86_400_000;
    const counts = new Map<string, number>();
    for (const ev of store.readEvents) {
      if (new Date(ev.occurredAt).getTime() < cutoff) continue;
      counts.set(ev.postId, (counts.get(ev.postId) ?? 0) + 1);
    }
    const sortedIds = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
    return sortedIds
      .map((id) => store.posts.get(id))
      .filter((p): p is Post => Boolean(p))
      .map((p) => hydrate(p, store.publishers, store.postTags, store.tags))
      .filter((p): p is PostWithRelations => p !== null);
  },

  async setBody(postId: string, input: SetPostBodyInput) {
    const store = getMemoryStore();
    const existing = store.posts.get(postId);
    if (!existing) return;
    store.posts.set(postId, {
      ...existing,
      bodyHtml: input.bodyHtml,
      bodySource: input.bodySource,
      bodyExtractedAt: input.bodyExtractedAt,
      bodyFailedAt: null,
      bodyFailedReason: null,
    });
  },

  async setBodyFailed(postId: string, input: SetPostBodyFailedInput) {
    const store = getMemoryStore();
    const existing = store.posts.get(postId);
    if (!existing) return;
    store.posts.set(postId, {
      ...existing,
      bodyFailedAt: input.failedAt,
      bodyFailedReason: input.reason,
    });
  },
};

function sortByTrending(
  posts: PostWithRelations[],
  readEvents: { postId: string; occurredAt: string }[],
): PostWithRelations[] {
  const cutoff = Date.now() - 7 * 86_400_000;
  const counts = new Map<string, number>();
  for (const ev of readEvents) {
    if (new Date(ev.occurredAt).getTime() < cutoff) continue;
    counts.set(ev.postId, (counts.get(ev.postId) ?? 0) + 1);
  }
  return [...posts].sort((a, b) => {
    const ca = counts.get(a.id) ?? 0;
    const cb = counts.get(b.id) ?? 0;
    if (cb !== ca) return cb - ca;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}
