/**
 * @file Supabase BlogSourceRepository implementation.
 *
 * Admin writes go through the service-role client because the schema
 * does not expose any INSERT/UPDATE/DELETE policy to authenticated
 * users (see migration 0002 — only `blog_sources_anon_read` exists).
 * The action layer re-checks `requireAdmin()`, validates the input,
 * and writes an audit row before invoking these methods.
 *
 * `update()` translates the Postgres unique-violation `23505` raised
 * by the `(publisher_id, feed_url)` index into a sentinel
 * `DUPLICATE_FEED_URL` error so the action can render an inline error
 * without leaking DB internals to the user.
 */

import type { BlogSource, SourceKind } from "../../../types";
import type { BlogSourceRepository } from "../../types";
import { getAdminClient } from "../clients";

interface BlogSourceRow {
  id: string;
  publisher_id: string;
  kind: SourceKind;
  feed_url: string;
  scrape_config: { selector?: string; baseUrl?: string } | null;
  is_active: boolean;
  last_fetched_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  consecutive_failures: number;
  created_at: string;
}

const COLUMNS =
  "id,publisher_id,kind,feed_url,scrape_config,is_active,last_fetched_at,last_error_at,last_error_message,consecutive_failures,created_at";

function mapRow(row: BlogSourceRow): BlogSource {
  return {
    id: row.id,
    publisherId: row.publisher_id,
    kind: row.kind,
    feedUrl: row.feed_url,
    scrapeConfig: row.scrape_config,
    isActive: row.is_active,
    lastFetchedAt: row.last_fetched_at,
    lastErrorAt: row.last_error_at,
    lastErrorMessage: row.last_error_message,
    consecutiveFailures: row.consecutive_failures,
    createdAt: row.created_at,
  };
}

const PG_UNIQUE_VIOLATION = "23505";

export const supabaseBlogSourceRepo: BlogSourceRepository = {
  async listByPublisher(publisherId) {
    const { data, error } = await getAdminClient()
      .from("blog_sources")
      .select(COLUMNS)
      .eq("publisher_id", publisherId)
      .order("created_at", { ascending: true })
      .returns<BlogSourceRow[]>();
    if (error) throw new Error(`blogSources.listByPublisher failed: ${error.message}`);
    return (data ?? []).map(mapRow);
  },
  async listActive() {
    const { data, error } = await getAdminClient()
      .from("blog_sources")
      .select(COLUMNS)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .returns<BlogSourceRow[]>();
    if (error) throw new Error(`blogSources.listActive failed: ${error.message}`);
    return (data ?? []).map(mapRow);
  },
  async list({ isActive } = {}) {
    let query = getAdminClient()
      .from("blog_sources")
      .select(COLUMNS)
      .order("created_at", { ascending: true });
    if (typeof isActive === "boolean") query = query.eq("is_active", isActive);
    const { data, error } = await query.returns<BlogSourceRow[]>();
    if (error) throw new Error(`blogSources.list failed: ${error.message}`);
    return (data ?? []).map(mapRow);
  },
  async getById(id) {
    const { data, error } = await getAdminClient()
      .from("blog_sources")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle<BlogSourceRow>();
    if (error) throw new Error(`blogSources.getById failed: ${error.message}`);
    return data ? mapRow(data) : null;
  },
  async upsert(source) {
    const { data, error } = await getAdminClient()
      .from("blog_sources")
      .upsert(
        {
          id: source.id,
          publisher_id: source.publisherId,
          kind: source.kind,
          feed_url: source.feedUrl,
          scrape_config: source.scrapeConfig,
          is_active: source.isActive,
          last_fetched_at: source.lastFetchedAt,
          last_error_at: source.lastErrorAt,
          last_error_message: source.lastErrorMessage,
          consecutive_failures: source.consecutiveFailures,
          created_at: source.createdAt,
        },
        { onConflict: "id" },
      )
      .select(COLUMNS)
      .single<BlogSourceRow>();
    if (error) throw new Error(`blogSources.upsert failed: ${error.message}`);
    return mapRow(data);
  },
  async update(id, patch) {
    const { data, error } = await getAdminClient()
      .from("blog_sources")
      .update({
        publisher_id: patch.publisherId,
        feed_url: patch.feedUrl,
        kind: patch.kind,
      })
      .eq("id", id)
      .select(COLUMNS)
      .single<BlogSourceRow>();
    if (error) {
      if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw new Error("DUPLICATE_FEED_URL");
      }
      throw new Error(`blogSources.update failed: ${error.message}`);
    }
    return mapRow(data);
  },
  async setActive(id, isActive) {
    const { error } = await getAdminClient()
      .from("blog_sources")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw new Error(`blogSources.setActive failed: ${error.message}`);
  },
  async delete(id) {
    const { error } = await getAdminClient().from("blog_sources").delete().eq("id", id);
    if (error) throw new Error(`blogSources.delete failed: ${error.message}`);
  },
  async recordSuccess(sourceId, fetchedAt) {
    const { error } = await getAdminClient()
      .from("blog_sources")
      .update({
        last_fetched_at: fetchedAt,
        last_error_at: null,
        last_error_message: null,
        consecutive_failures: 0,
      })
      .eq("id", sourceId);
    if (error) throw new Error(`blogSources.recordSuccess failed: ${error.message}`);
  },
  async recordFailure(sourceId, message, occurredAt) {
    const existing = await getAdminClient()
      .from("blog_sources")
      .select("consecutive_failures")
      .eq("id", sourceId)
      .maybeSingle<{ consecutive_failures: number }>();
    const next = (existing.data?.consecutive_failures ?? 0) + 1;
    const { error } = await getAdminClient()
      .from("blog_sources")
      .update({
        last_error_at: occurredAt,
        last_error_message: message,
        consecutive_failures: next,
      })
      .eq("id", sourceId);
    if (error) throw new Error(`blogSources.recordFailure failed: ${error.message}`);
  },
};
