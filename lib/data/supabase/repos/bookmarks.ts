/**
 * @file Supabase BookmarkRepository implementation.
 *
 * RLS policy `bookmarks_self_all` (migration 0003) only allows a
 * signed-in user to see/mutate their own row. We bypass RLS via the
 * service-role client and re-enforce ownership at the application
 * layer (action handlers + explicit `.eq("user_id", userId)` filters
 * on every query).
 *
 * `listForUser` follows the bookmarks → posts → publisher + tags chain
 * with a single nested select; the order-by-bookmark-creation is
 * preserved by ordering the inner table.
 */

import type { Bookmark, PostWithRelations, Tag } from "../../../types";
import type { BookmarkRepository } from "../../types";
import { nowIso } from "../../../dates";
import { getAdminClient } from "../clients";
import { mapPublisherRow, PUBLISHER_COLUMNS } from "./publishers";
import { mapTagRow, TAG_COLUMNS } from "./tags";

interface BookmarkRow {
  user_id: string;
  post_id: string;
  created_at: string;
}

function mapRow(row: BookmarkRow): Bookmark {
  return {
    userId: row.user_id,
    postId: row.post_id,
    createdAt: row.created_at,
  };
}

const POST_BASE =
  "id,publisher_id,source_id,title,summary,url,canonical_url,author_name,published_at,reading_time_min,access_label,paywall_provider,thumbnail_url,raw_content_hash,body_html,body_source,body_extracted_at,body_failed_at,body_failed_reason,created_at";

interface BookmarkWithPostRow extends BookmarkRow {
  post: {
    id: string;
    publisher_id: string;
    source_id: string;
    title: string;
    summary: string | null;
    url: string;
    canonical_url: string;
    author_name: string | null;
    published_at: string;
    reading_time_min: number | null;
    access_label: PostWithRelations["accessLabel"];
    paywall_provider: PostWithRelations["paywallProvider"];
    thumbnail_url: string | null;
    raw_content_hash: string | null;
    body_html: string | null;
    body_source: PostWithRelations["bodySource"];
    body_extracted_at: string | null;
    body_failed_at: string | null;
    body_failed_reason: string | null;
    created_at: string;
    publisher: Parameters<typeof mapPublisherRow>[0];
    post_tags: { tag: Parameters<typeof mapTagRow>[0] | null }[] | null;
  } | null;
}

export const supabaseBookmarkRepo: BookmarkRepository = {
  async listForUser(userId) {
    const { data, error } = await getAdminClient()
      .from("bookmarks")
      .select(
        `user_id,post_id,created_at,post:posts!inner(${POST_BASE},publisher:publishers!inner(${PUBLISHER_COLUMNS}),post_tags(tag:tags(${TAG_COLUMNS})))`,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .returns<BookmarkWithPostRow[]>();
    if (error) throw new Error(`bookmarks.listForUser failed: ${error.message}`);
    const out: PostWithRelations[] = [];
    for (const row of data ?? []) {
      if (!row.post) continue;
      out.push({
        id: row.post.id,
        publisherId: row.post.publisher_id,
        sourceId: row.post.source_id,
        title: row.post.title,
        summary: row.post.summary,
        url: row.post.url,
        canonicalUrl: row.post.canonical_url,
        authorName: row.post.author_name,
        publishedAt: row.post.published_at,
        readingTimeMin: row.post.reading_time_min,
        accessLabel: row.post.access_label,
        paywallProvider: row.post.paywall_provider,
        thumbnailUrl: row.post.thumbnail_url,
        rawContentHash: row.post.raw_content_hash,
        bodyHtml: row.post.body_html,
        bodySource: row.post.body_source,
        bodyExtractedAt: row.post.body_extracted_at,
        bodyFailedAt: row.post.body_failed_at,
        bodyFailedReason: row.post.body_failed_reason,
        createdAt: row.post.created_at,
        publisher: mapPublisherRow(row.post.publisher),
        tags: (row.post.post_tags ?? [])
          .map((pt) => (pt.tag ? mapTagRow(pt.tag) : null))
          .filter((t): t is Tag => t !== null),
      });
    }
    return out;
  },
  async toggle(userId, postId) {
    const admin = getAdminClient();
    const existing = await admin
      .from("bookmarks")
      .select("user_id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle();
    if (existing.error) throw new Error(`bookmarks.toggle failed: ${existing.error.message}`);
    if (existing.data) {
      const { error } = await admin
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);
      if (error) throw new Error(`bookmarks.toggle failed: ${error.message}`);
      return { bookmarked: false };
    }
    const { error } = await admin.from("bookmarks").insert({
      user_id: userId,
      post_id: postId,
      created_at: nowIso(),
    });
    if (error) throw new Error(`bookmarks.toggle failed: ${error.message}`);
    return { bookmarked: true };
  },
  async has(userId, postId) {
    const { data, error } = await getAdminClient()
      .from("bookmarks")
      .select("user_id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle();
    if (error) throw new Error(`bookmarks.has failed: ${error.message}`);
    return data !== null;
  },
  async bulkHas(userId, postIds) {
    if (postIds.length === 0) return new Set<string>();
    const { data, error } = await getAdminClient()
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds)
      .returns<{ post_id: string }[]>();
    if (error) throw new Error(`bookmarks.bulkHas failed: ${error.message}`);
    return new Set((data ?? []).map((r) => r.post_id));
  },
  async raw(userId) {
    const { data, error } = await getAdminClient()
      .from("bookmarks")
      .select("user_id,post_id,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .returns<BookmarkRow[]>();
    if (error) throw new Error(`bookmarks.raw failed: ${error.message}`);
    return (data ?? []).map(mapRow);
  },
};
