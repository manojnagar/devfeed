/**
 * @file Supabase FollowRepository implementation (publishers + tags).
 *
 * Mirrors the in-memory adapter's toggle semantics: insert when absent,
 * delete when present. The (`user_id`, `publisher_id`) and
 * (`user_id`, `tag_id`) primary keys (migration 0003) make the lookup
 * O(1).
 */

import type {
  FollowedPublisher,
  FollowedTag,
  Publisher,
  Tag,
} from "../../../types";
import type { FollowRepository } from "../../types";
import { nowIso } from "../../../dates";
import { getAdminClient } from "../clients";
import { mapPublisherRow, PUBLISHER_COLUMNS } from "./publishers";
import { mapTagRow, TAG_COLUMNS } from "./tags";

interface FollowedPublisherRow {
  user_id: string;
  publisher_id: string;
  created_at: string;
}

interface FollowedTagRow {
  user_id: string;
  tag_id: string;
  created_at: string;
}

interface FollowedPublisherJoinRow extends FollowedPublisherRow {
  publisher: Parameters<typeof mapPublisherRow>[0] | null;
}

interface FollowedTagJoinRow extends FollowedTagRow {
  tag: Parameters<typeof mapTagRow>[0] | null;
}

export const supabaseFollowRepo: FollowRepository = {
  async listFollowedPublishers(userId) {
    const { data, error } = await getAdminClient()
      .from("user_followed_publishers")
      .select(`user_id,publisher_id,created_at,publisher:publishers!inner(${PUBLISHER_COLUMNS})`)
      .eq("user_id", userId)
      .returns<FollowedPublisherJoinRow[]>();
    if (error) throw new Error(`follows.listFollowedPublishers failed: ${error.message}`);
    const out: Publisher[] = [];
    for (const row of data ?? []) {
      if (row.publisher) out.push(mapPublisherRow(row.publisher));
    }
    return out;
  },
  async listFollowedTags(userId) {
    const { data, error } = await getAdminClient()
      .from("user_followed_tags")
      .select(`user_id,tag_id,created_at,tag:tags!inner(${TAG_COLUMNS})`)
      .eq("user_id", userId)
      .returns<FollowedTagJoinRow[]>();
    if (error) throw new Error(`follows.listFollowedTags failed: ${error.message}`);
    const out: Tag[] = [];
    for (const row of data ?? []) {
      if (row.tag) out.push(mapTagRow(row.tag));
    }
    return out;
  },
  async togglePublisher(userId, publisherId) {
    const admin = getAdminClient();
    const existing = await admin
      .from("user_followed_publishers")
      .select("user_id")
      .eq("user_id", userId)
      .eq("publisher_id", publisherId)
      .maybeSingle();
    if (existing.error) {
      throw new Error(`follows.togglePublisher failed: ${existing.error.message}`);
    }
    if (existing.data) {
      const { error } = await admin
        .from("user_followed_publishers")
        .delete()
        .eq("user_id", userId)
        .eq("publisher_id", publisherId);
      if (error) throw new Error(`follows.togglePublisher failed: ${error.message}`);
      return { followed: false };
    }
    const { error } = await admin.from("user_followed_publishers").insert({
      user_id: userId,
      publisher_id: publisherId,
      created_at: nowIso(),
    });
    if (error) throw new Error(`follows.togglePublisher failed: ${error.message}`);
    return { followed: true };
  },
  async toggleTag(userId, tagId) {
    const admin = getAdminClient();
    const existing = await admin
      .from("user_followed_tags")
      .select("user_id")
      .eq("user_id", userId)
      .eq("tag_id", tagId)
      .maybeSingle();
    if (existing.error) throw new Error(`follows.toggleTag failed: ${existing.error.message}`);
    if (existing.data) {
      const { error } = await admin
        .from("user_followed_tags")
        .delete()
        .eq("user_id", userId)
        .eq("tag_id", tagId);
      if (error) throw new Error(`follows.toggleTag failed: ${error.message}`);
      return { followed: false };
    }
    const { error } = await admin.from("user_followed_tags").insert({
      user_id: userId,
      tag_id: tagId,
      created_at: nowIso(),
    });
    if (error) throw new Error(`follows.toggleTag failed: ${error.message}`);
    return { followed: true };
  },
  async rawPublishers(userId): Promise<FollowedPublisher[]> {
    const { data, error } = await getAdminClient()
      .from("user_followed_publishers")
      .select("user_id,publisher_id,created_at")
      .eq("user_id", userId)
      .returns<FollowedPublisherRow[]>();
    if (error) throw new Error(`follows.rawPublishers failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      userId: r.user_id,
      publisherId: r.publisher_id,
      createdAt: r.created_at,
    }));
  },
  async rawTags(userId): Promise<FollowedTag[]> {
    const { data, error } = await getAdminClient()
      .from("user_followed_tags")
      .select("user_id,tag_id,created_at")
      .eq("user_id", userId)
      .returns<FollowedTagRow[]>();
    if (error) throw new Error(`follows.rawTags failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      userId: r.user_id,
      tagId: r.tag_id,
      createdAt: r.created_at,
    }));
  },
};
