/**
 * @file Supabase TagRepository implementation.
 *
 * `matchByKeywords` mirrors the memory adapter: iterate the static
 * `TAG_SEEDS` keyword map and surface tags whose seed keywords appear
 * in the input text. The seed list is the canonical taxonomy — tags
 * not in the seed are never auto-tagged.
 *
 * `merge` rewrites every `post_tags` row from the source tag to the
 * target before deleting the source row. We do this in two statements
 * because the Postgres unique constraint on `(post_id, tag_id)` means
 * a naive UPDATE could collide if the post is already tagged with the
 * target — the DELETE-source-rows-that-collide pattern handles that
 * case cleanly.
 */

import type { Tag } from "../../../types";
import type { TagRepository } from "../../types";
import { getAdminClient } from "../clients";
import { TAG_SEEDS } from "../../seed/tags";

interface TagRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_featured: boolean;
}

export const TAG_COLUMNS = "id,slug,name,description,is_featured";

export function mapTagRow(row: TagRow): Tag {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isFeatured: row.is_featured,
  };
}

export const supabaseTagRepo: TagRepository = {
  async list({ featuredOnly = false } = {}) {
    let query = getAdminClient()
      .from("tags")
      .select(TAG_COLUMNS)
      .order("name", { ascending: true });
    if (featuredOnly) query = query.eq("is_featured", true);
    const { data, error } = await query.returns<TagRow[]>();
    if (error) throw new Error(`tags.list failed: ${error.message}`);
    return (data ?? []).map(mapTagRow);
  },
  async getBySlug(slug) {
    const { data, error } = await getAdminClient()
      .from("tags")
      .select(TAG_COLUMNS)
      .eq("slug", slug)
      .maybeSingle<TagRow>();
    if (error) throw new Error(`tags.getBySlug failed: ${error.message}`);
    return data ? mapTagRow(data) : null;
  },
  async upsertMany(tags) {
    if (tags.length === 0) return [];
    const { data, error } = await getAdminClient()
      .from("tags")
      .upsert(
        tags.map((t) => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          description: t.description,
          is_featured: t.isFeatured,
        })),
        { onConflict: "id" },
      )
      .select(TAG_COLUMNS)
      .returns<TagRow[]>();
    if (error) throw new Error(`tags.upsertMany failed: ${error.message}`);
    return (data ?? []).map(mapTagRow);
  },
  async matchByKeywords(text) {
    const lower = text.toLowerCase();
    const matchingSlugs = TAG_SEEDS.filter((seed) =>
      seed.keywords.some((kw) => lower.includes(kw.toLowerCase())),
    ).map((seed) => seed.slug);
    if (matchingSlugs.length === 0) return [];
    const { data, error } = await getAdminClient()
      .from("tags")
      .select(TAG_COLUMNS)
      .in("slug", matchingSlugs)
      .returns<TagRow[]>();
    if (error) throw new Error(`tags.matchByKeywords failed: ${error.message}`);
    return (data ?? []).map(mapTagRow);
  },
  async merge(sourceId, targetId) {
    if (sourceId === targetId) return;
    const admin = getAdminClient();
    // Delete any (post, target) edges that would collide with the
    // (post, source) edges before re-pointing them at the target.
    const { data: postsTaggedSource, error: listErr } = await admin
      .from("post_tags")
      .select("post_id")
      .eq("tag_id", sourceId)
      .returns<{ post_id: string }[]>();
    if (listErr) throw new Error(`tags.merge failed: ${listErr.message}`);
    const postIds = (postsTaggedSource ?? []).map((row) => row.post_id);
    if (postIds.length > 0) {
      const { error: dedupErr } = await admin
        .from("post_tags")
        .delete()
        .eq("tag_id", targetId)
        .in("post_id", postIds);
      if (dedupErr) throw new Error(`tags.merge failed: ${dedupErr.message}`);
    }
    const { error: updateErr } = await admin
      .from("post_tags")
      .update({ tag_id: targetId })
      .eq("tag_id", sourceId);
    if (updateErr) throw new Error(`tags.merge failed: ${updateErr.message}`);
    const { error: deleteErr } = await admin.from("tags").delete().eq("id", sourceId);
    if (deleteErr) throw new Error(`tags.merge failed: ${deleteErr.message}`);
  },
};
