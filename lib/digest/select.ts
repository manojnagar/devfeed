/**
 * @file Digest content selection.
 *
 * Pure function that picks which posts to include in a user's digest
 * based on their preferences + follows. Unit-tested independently from
 * the email send pipeline.
 */

import type { DigestPreferences, PostWithRelations } from "../types";

export interface SelectDigestPostsInput {
  preferences: DigestPreferences;
  candidates: PostWithRelations[];
  followedPublisherIds: string[];
  followedTagIds: string[];
  since: Date;
}

/** Select up to `maxPostsPerEmail` posts matching the preferences. */
export function selectDigestPosts(input: SelectDigestPostsInput): PostWithRelations[] {
  const { preferences, candidates, followedPublisherIds, followedTagIds, since } = input;
  const allowed = new Set(preferences.includeAccessLabels);

  const filtered = candidates.filter((post) => {
    if (new Date(post.publishedAt).getTime() < since.getTime()) return false;
    if (!allowed.has(post.accessLabel)) return false;
    const matchesPublisher =
      preferences.includeFollowedPublishers && followedPublisherIds.includes(post.publisherId);
    const matchesTag =
      preferences.includeFollowedTags &&
      post.tags.some((t) => followedTagIds.includes(t.id));
    if (followedPublisherIds.length === 0 && followedTagIds.length === 0) return true;
    return matchesPublisher || matchesTag;
  });

  filtered.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  return filtered.slice(0, preferences.maxPostsPerEmail);
}
