/**
 * @file In-memory FollowRepository (publishers + tags).
 */

import type { FollowRepository } from "../../types";
import { nowIso } from "../../../dates";
import { getMemoryStore } from "../store";

export const memoryFollowRepo: FollowRepository = {
  async listFollowedPublishers(userId) {
    const store = getMemoryStore();
    return store.followedPublishers
      .filter((f) => f.userId === userId)
      .map((f) => store.publishers.get(f.publisherId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  },
  async listFollowedTags(userId) {
    const store = getMemoryStore();
    return store.followedTags
      .filter((f) => f.userId === userId)
      .map((f) => store.tags.get(f.tagId))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  },
  async togglePublisher(userId, publisherId) {
    const store = getMemoryStore();
    const idx = store.followedPublishers.findIndex(
      (f) => f.userId === userId && f.publisherId === publisherId,
    );
    if (idx >= 0) {
      store.followedPublishers.splice(idx, 1);
      return { followed: false };
    }
    store.followedPublishers.push({ userId, publisherId, createdAt: nowIso() });
    return { followed: true };
  },
  async toggleTag(userId, tagId) {
    const store = getMemoryStore();
    const idx = store.followedTags.findIndex(
      (f) => f.userId === userId && f.tagId === tagId,
    );
    if (idx >= 0) {
      store.followedTags.splice(idx, 1);
      return { followed: false };
    }
    store.followedTags.push({ userId, tagId, createdAt: nowIso() });
    return { followed: true };
  },
  async rawPublishers(userId) {
    return getMemoryStore().followedPublishers.filter((f) => f.userId === userId);
  },
  async rawTags(userId) {
    return getMemoryStore().followedTags.filter((f) => f.userId === userId);
  },
};
