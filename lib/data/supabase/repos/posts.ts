/**
 * @file Supabase PostRepository implementation.
 *
 * The list query mirrors the in-memory adapter's filter semantics:
 *   - publisher type: filtered via `publishers.type` join column
 *   - publisher slug(s): resolved to ids first, then `posts.publisher_id`
 *   - tag slug(s): resolved to ids → `post_tags.tag_id` → post ids
 *   - access label(s): direct `posts.access_label` filter
 *   - from date: `posts.published_at >= from`
 *   - free-text q: ILIKE against title + summary (FTS index in migration
 *     0002 stays unused for now to keep the surface simple — switching
 *     to `.textSearch()` is a single-line change later if perf demands)
 *   - followed publishers/tags: union filter (post matches if it belongs
 *     to a followed publisher OR has a followed tag)
 *
 * Trending sort uses the `trending_posts_7d` materialized view from
 * migration 0005; if the view is empty (e.g. fresh DB) we fall back
 * to recency.
 *
 * `setBody` and `setBodyFailed` are admin-only (RLS does not expose
 * INSERT/UPDATE on `posts` to authenticated users), so they go through
 * the service-role client.
 */

import type {
  AccessLabel,
  PaywallProvider,
  Post,
  PostBodySource,
  PostWithRelations,
  Tag,
} from "../../../types";
import type {
  ListPostsOptions,
  PostRepository,
  SetPostBodyFailedInput,
  SetPostBodyInput,
} from "../../types";
import { getAdminClient } from "../clients";
import { mapPublisherRow, PUBLISHER_COLUMNS } from "./publishers";
import { mapTagRow, TAG_COLUMNS } from "./tags";

const DEFAULT_PAGE_SIZE = 20;

interface PostRow {
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
  access_label: AccessLabel;
  paywall_provider: PaywallProvider;
  thumbnail_url: string | null;
  raw_content_hash: string | null;
  body_html: string | null;
  body_source: PostBodySource | null;
  body_extracted_at: string | null;
  body_failed_at: string | null;
  body_failed_reason: string | null;
  created_at: string;
}

const POST_BASE_COLUMNS =
  "id,publisher_id,source_id,title,summary,url,canonical_url,author_name,published_at,reading_time_min,access_label,paywall_provider,thumbnail_url,raw_content_hash,body_html,body_source,body_extracted_at,body_failed_at,body_failed_reason,created_at";

const POST_WITH_RELATIONS_SELECT = `${POST_BASE_COLUMNS},publisher:publishers!inner(${PUBLISHER_COLUMNS}),post_tags(tag:tags(${TAG_COLUMNS}))`;

interface PublisherJoin {
  id: string;
  type: "company" | "person";
  slug: string;
  name: string;
  website_url: string;
  description: string | null;
  logo_url: string | null;
  twitter_handle: string | null;
  github_handle: string | null;
  home_country: string | null;
  default_access_label: AccessLabel;
  default_paywall_provider: PaywallProvider;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TagJoin {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_featured: boolean;
}

interface PostWithRelationsRow extends PostRow {
  publisher: PublisherJoin;
  post_tags: { tag: TagJoin | null }[] | null;
}

function mapPost(row: PostRow): Post {
  return {
    id: row.id,
    publisherId: row.publisher_id,
    sourceId: row.source_id,
    title: row.title,
    summary: row.summary,
    url: row.url,
    canonicalUrl: row.canonical_url,
    authorName: row.author_name,
    publishedAt: row.published_at,
    readingTimeMin: row.reading_time_min,
    accessLabel: row.access_label,
    paywallProvider: row.paywall_provider,
    thumbnailUrl: row.thumbnail_url,
    rawContentHash: row.raw_content_hash,
    bodyHtml: row.body_html,
    bodySource: row.body_source,
    bodyExtractedAt: row.body_extracted_at,
    bodyFailedAt: row.body_failed_at,
    bodyFailedReason: row.body_failed_reason,
    createdAt: row.created_at,
  };
}

function mapPostWithRelations(row: PostWithRelationsRow): PostWithRelations {
  return {
    ...mapPost(row),
    publisher: mapPublisherRow(row.publisher),
    tags: (row.post_tags ?? [])
      .map((pt) => (pt.tag ? mapTagRow(pt.tag) : null))
      .filter((t): t is Tag => t !== null),
  };
}

async function resolvePublisherSlugsToIds(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await getAdminClient()
    .from("publishers")
    .select("id")
    .in("slug", slugs)
    .returns<{ id: string }[]>();
  if (error) throw new Error(`posts.list failed (publisher slug lookup): ${error.message}`);
  return (data ?? []).map((r) => r.id);
}

async function resolveTagSlugsToIds(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await getAdminClient()
    .from("tags")
    .select("id")
    .in("slug", slugs)
    .returns<{ id: string }[]>();
  if (error) throw new Error(`posts.list failed (tag slug lookup): ${error.message}`);
  return (data ?? []).map((r) => r.id);
}

async function resolvePostIdsForTagIds(tagIds: string[]): Promise<string[]> {
  if (tagIds.length === 0) return [];
  const { data, error } = await getAdminClient()
    .from("post_tags")
    .select("post_id")
    .in("tag_id", tagIds)
    .returns<{ post_id: string }[]>();
  if (error) throw new Error(`posts.list failed (tag→post lookup): ${error.message}`);
  return Array.from(new Set((data ?? []).map((r) => r.post_id)));
}

function escapeIlikePattern(input: string): string {
  // Escape PostgREST OR-filter delimiters (`,`) and ILIKE wildcards.
  return input.replace(/[,()%_\\]/g, (m) => `\\${m}`);
}

export const supabasePostRepo: PostRepository = {
  async list(options: ListPostsOptions) {
    const admin = getAdminClient();
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const page = options.page ?? 1;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const publisherSlugs = options.publisher ?? [];
    const tagSlugs = options.tag ?? [];
    const followedPublisherIds = options.followedPublisherIds ?? [];
    const followedTagIds = options.followedTagIds ?? [];

    const slugFilteredPublisherIds = await resolvePublisherSlugsToIds(publisherSlugs);
    if (publisherSlugs.length > 0 && slugFilteredPublisherIds.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }

    const tagFilteredIds = await resolveTagSlugsToIds(tagSlugs);
    if (tagSlugs.length > 0 && tagFilteredIds.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }
    const postIdsForTagFilter =
      tagFilteredIds.length > 0 ? await resolvePostIdsForTagIds(tagFilteredIds) : null;
    if (postIdsForTagFilter && postIdsForTagFilter.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }

    const followedPostIdsFromTags =
      followedTagIds.length > 0 ? await resolvePostIdsForTagIds(followedTagIds) : [];
    const personalizationActive =
      followedPublisherIds.length > 0 || followedTagIds.length > 0;

    let query = admin
      .from("posts")
      .select(POST_WITH_RELATIONS_SELECT, { count: "exact" });

    if (slugFilteredPublisherIds.length > 0) {
      query = query.in("publisher_id", slugFilteredPublisherIds);
    }
    if (options.type && options.type.length > 0) {
      query = query.in("publisher.type", options.type);
    }
    if (postIdsForTagFilter) {
      query = query.in("id", postIdsForTagFilter);
    }
    if (options.access && options.access.length > 0) {
      query = query.in("access_label", options.access);
    }
    if (options.from instanceof Date) {
      query = query.gte("published_at", options.from.toISOString());
    }
    if (options.q && options.q.trim().length > 0) {
      const safe = escapeIlikePattern(options.q.trim());
      const pattern = `%${safe}%`;
      query = query.or(`title.ilike.${pattern},summary.ilike.${pattern}`);
    }
    if (personalizationActive) {
      const followedPostIdSet = Array.from(new Set(followedPostIdsFromTags));
      const orParts: string[] = [];
      if (followedPublisherIds.length > 0) {
        orParts.push(`publisher_id.in.(${followedPublisherIds.join(",")})`);
      }
      if (followedPostIdSet.length > 0) {
        orParts.push(`id.in.(${followedPostIdSet.join(",")})`);
      }
      if (orParts.length === 0) {
        return { items: [], total: 0, page, pageSize };
      }
      query = query.or(orParts.join(","));
    }

    if (options.sort === "trending") {
      const { data: trendingRows, error: trendErr } = await admin
        .from("trending_posts_7d")
        .select("post_id,read_count")
        .order("read_count", { ascending: false })
        .returns<{ post_id: string; read_count: number }[]>();
      if (trendErr) throw new Error(`posts.list failed (trending view): ${trendErr.message}`);
      const trendingOrder = new Map<string, number>();
      (trendingRows ?? []).forEach((r, idx) => trendingOrder.set(r.post_id, idx));

      query = query.order("published_at", { ascending: false });
      const { data, error, count } = await query.returns<PostWithRelationsRow[]>();
      if (error) throw new Error(`posts.list failed: ${error.message}`);
      const all = (data ?? []).map(mapPostWithRelations);
      all.sort((a, b) => {
        const ai = trendingOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bi = trendingOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });
      const items = all.slice(start, start + pageSize);
      return { items, total: count ?? all.length, page, pageSize };
    }

    query = query.order("published_at", { ascending: false }).range(start, end);
    const { data, error, count } = await query.returns<PostWithRelationsRow[]>();
    if (error) throw new Error(`posts.list failed: ${error.message}`);
    return {
      items: (data ?? []).map(mapPostWithRelations),
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async getById(id) {
    const { data, error } = await getAdminClient()
      .from("posts")
      .select(POST_WITH_RELATIONS_SELECT)
      .eq("id", id)
      .maybeSingle<PostWithRelationsRow>();
    if (error) throw new Error(`posts.getById failed: ${error.message}`);
    return data ? mapPostWithRelations(data) : null;
  },

  async getByCanonicalUrl(canonicalUrl) {
    const { data, error } = await getAdminClient()
      .from("posts")
      .select(POST_BASE_COLUMNS)
      .eq("canonical_url", canonicalUrl)
      .maybeSingle<PostRow>();
    if (error) throw new Error(`posts.getByCanonicalUrl failed: ${error.message}`);
    return data ? mapPost(data) : null;
  },

  async insertMany(posts) {
    if (posts.length === 0) return 0;
    const rows = posts.map((p) => ({
      id: p.id,
      publisher_id: p.publisherId,
      source_id: p.sourceId,
      title: p.title,
      summary: p.summary,
      url: p.url,
      canonical_url: p.canonicalUrl,
      author_name: p.authorName,
      published_at: p.publishedAt,
      reading_time_min: p.readingTimeMin,
      access_label: p.accessLabel,
      paywall_provider: p.paywallProvider,
      thumbnail_url: p.thumbnailUrl,
      raw_content_hash: p.rawContentHash,
      body_html: p.bodyHtml,
      body_source: p.bodySource,
      body_extracted_at: p.bodyExtractedAt,
      body_failed_at: p.bodyFailedAt,
      body_failed_reason: p.bodyFailedReason,
      created_at: p.createdAt,
    }));
    // Use upsert with ignoreDuplicates so re-running ingest is idempotent.
    const { data, error } = await getAdminClient()
      .from("posts")
      .upsert(rows, { onConflict: "canonical_url", ignoreDuplicates: true })
      .select("id")
      .returns<{ id: string }[]>();
    if (error) throw new Error(`posts.insertMany failed: ${error.message}`);
    return data?.length ?? 0;
  },

  async attachTags(postId, tagIds) {
    if (tagIds.length === 0) return;
    const rows = tagIds.map((tagId) => ({ post_id: postId, tag_id: tagId }));
    const { error } = await getAdminClient()
      .from("post_tags")
      .upsert(rows, { onConflict: "post_id,tag_id", ignoreDuplicates: true });
    if (error) throw new Error(`posts.attachTags failed: ${error.message}`);
  },

  async trendingTop(limit, days) {
    const admin = getAdminClient();
    if (days === 7) {
      const { data: trending, error: trendErr } = await admin
        .from("trending_posts_7d")
        .select("post_id,read_count")
        .order("read_count", { ascending: false })
        .limit(limit)
        .returns<{ post_id: string; read_count: number }[]>();
      if (trendErr) {
        throw new Error(`posts.trendingTop failed (view): ${trendErr.message}`);
      }
      const ids = (trending ?? [])
        .filter((r) => r.read_count > 0)
        .map((r) => r.post_id);
      if (ids.length === 0) return [];
      const { data, error } = await admin
        .from("posts")
        .select(POST_WITH_RELATIONS_SELECT)
        .in("id", ids)
        .returns<PostWithRelationsRow[]>();
      if (error) throw new Error(`posts.trendingTop failed: ${error.message}`);
      const order = new Map(ids.map((id, idx) => [id, idx]));
      return (data ?? [])
        .map(mapPostWithRelations)
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    // Non-7d windows: ad-hoc aggregate against read_events.
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data: events, error: evErr } = await admin
      .from("read_events")
      .select("post_id")
      .gte("occurred_at", cutoff)
      .returns<{ post_id: string }[]>();
    if (evErr) throw new Error(`posts.trendingTop failed (events): ${evErr.message}`);
    const counts = new Map<string, number>();
    for (const ev of events ?? []) {
      counts.set(ev.post_id, (counts.get(ev.post_id) ?? 0) + 1);
    }
    const ids = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
    if (ids.length === 0) return [];
    const { data, error } = await admin
      .from("posts")
      .select(POST_WITH_RELATIONS_SELECT)
      .in("id", ids)
      .returns<PostWithRelationsRow[]>();
    if (error) throw new Error(`posts.trendingTop failed: ${error.message}`);
    const order = new Map(ids.map((id, idx) => [id, idx]));
    return (data ?? [])
      .map(mapPostWithRelations)
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  },

  async setBody(postId, input: SetPostBodyInput) {
    const { error } = await getAdminClient()
      .from("posts")
      .update({
        body_html: input.bodyHtml,
        body_source: input.bodySource,
        body_extracted_at: input.bodyExtractedAt,
        body_failed_at: null,
        body_failed_reason: null,
      })
      .eq("id", postId);
    if (error) throw new Error(`posts.setBody failed: ${error.message}`);
  },

  async setBodyFailed(postId, input: SetPostBodyFailedInput) {
    const { error } = await getAdminClient()
      .from("posts")
      .update({
        body_failed_at: input.failedAt,
        body_failed_reason: input.reason,
      })
      .eq("id", postId);
    if (error) throw new Error(`posts.setBodyFailed failed: ${error.message}`);
  },
};
