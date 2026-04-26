/**
 * @file In-memory BookmarkRepository implementation.
 */

import type { Post, PostWithRelations } from "../../../types";
import type { BookmarkRepository } from "../../types";
import { nowIso } from "../../../dates";
import { getMemoryStore } from "../store";

function hydratePosts(postIds: string[]): PostWithRelations[] {
  const store = getMemoryStore();
  return postIds
    .map((id) => store.posts.get(id))
    .filter((p): p is Post => Boolean(p))
    .map((post) => ({
      ...post,
      publisher: store.publishers.get(post.publisherId)!,
      tags: store.postTags
        .filter((pt) => pt.postId === post.id)
        .map((pt) => store.tags.get(pt.tagId)!)
        .filter(Boolean),
    }));
}

export const memoryBookmarkRepo: BookmarkRepository = {
  async listForUser(userId) {
    const store = getMemoryStore();
    const ids = store.bookmarks
      .filter((b) => b.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((b) => b.postId);
    return hydratePosts(ids);
  },
  async toggle(userId, postId) {
    const store = getMemoryStore();
    const idx = store.bookmarks.findIndex((b) => b.userId === userId && b.postId === postId);
    if (idx >= 0) {
      store.bookmarks.splice(idx, 1);
      return { bookmarked: false };
    }
    store.bookmarks.push({ userId, postId, createdAt: nowIso() });
    return { bookmarked: true };
  },
  async has(userId, postId) {
    return getMemoryStore().bookmarks.some(
      (b) => b.userId === userId && b.postId === postId,
    );
  },
  async bulkHas(userId, postIds) {
    const set = new Set(
      getMemoryStore()
        .bookmarks.filter((b) => b.userId === userId)
        .map((b) => b.postId),
    );
    return new Set(postIds.filter((id) => set.has(id)));
  },
  async raw(userId) {
    return getMemoryStore().bookmarks.filter((b) => b.userId === userId);
  },
};
