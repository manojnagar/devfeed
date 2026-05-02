/**
 * @file Supabase Repository implementation — production scaffolding.
 *
 * Wires the entity contracts in `lib/data/types.ts` to a real Supabase
 * project. To keep the initial ship small we provide the structure +
 * one fully-implemented method per entity (so the typing is exercised
 * end-to-end) and throw a clear `NotImplementedError` from the rest.
 *
 * To finish the migration: replace each throw with the corresponding
 * supabase-js call against the schema in
 * `supabase/migrations/0001_init.sql`. The contracts + types are the
 * source of truth — they shouldn't need to change.
 */

import type { BlogSource, Profile, SourceKind, UserRole } from "../../types";
import type { Repository } from "../types";
import { getAdminClient } from "./clients";

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(
      `Supabase adapter method '${method}' is not implemented yet. Switch STORAGE_ADAPTER=memory or wire this method in lib/data/supabase/repository.ts.`,
    );
    this.name = "NotImplementedError";
  }
}

const todo = (method: string): never => {
  throw new NotImplementedError(method);
};

interface ProfileRow {
  user_id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  is_banned: boolean;
  created_at: string;
}

function mapProfileRow(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isBanned: row.is_banned,
    createdAt: row.created_at,
  };
}

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

const BLOG_SOURCE_COLUMNS =
  "id,publisher_id,kind,feed_url,scrape_config,is_active,last_fetched_at,last_error_at,last_error_message,consecutive_failures,created_at";

function mapBlogSourceRow(row: BlogSourceRow): BlogSource {
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

/**
 * Postgres unique-violation error code. The (publisher_id, feed_url)
 * unique index in `blog_sources` triggers this when an admin retypes a
 * URL that already exists. We surface it as a sentinel string the
 * action layer can translate into a friendly toast.
 */
const PG_UNIQUE_VIOLATION = "23505";

export const supabaseRepository: Repository = {
  publishers: {
    async list() {
      return todo("publishers.list");
    },
    async getBySlug() {
      return todo("publishers.getBySlug");
    },
    async getById() {
      return todo("publishers.getById");
    },
    async upsert() {
      return todo("publishers.upsert");
    },
    async setActive() {
      return todo("publishers.setActive");
    },
    async delete() {
      return todo("publishers.delete");
    },
  },
  /**
   * Blog sources (RSS/Atom/scrape configs).
   *
   * All admin writes go through the service-role client because:
   *   1. Anonymous + authenticated users only have SELECT on this table
   *      (see `blog_sources_anon_read` policy in migration 0002).
   *   2. There is no INSERT/UPDATE/DELETE policy for `authenticated`,
   *      so even an admin's user-scoped JWT cannot write here.
   *   3. The service-role key bypasses RLS, and the action layer
   *      re-checks `requireAdmin()` + zod validation + audit logging
   *      before invoking these methods.
   *
   * The `update` method translates Postgres unique-violation 23505 into
   * a sentinel error string (`DUPLICATE_FEED_URL`) so the action can
   * render an inline error without leaking DB internals.
   */
  blogSources: {
    async listByPublisher(publisherId: string): Promise<BlogSource[]> {
      const { data, error } = await getAdminClient()
        .from("blog_sources")
        .select(BLOG_SOURCE_COLUMNS)
        .eq("publisher_id", publisherId)
        .order("created_at", { ascending: true })
        .returns<BlogSourceRow[]>();
      if (error) throw new Error(`blogSources.listByPublisher failed: ${error.message}`);
      return (data ?? []).map(mapBlogSourceRow);
    },
    async listActive(): Promise<BlogSource[]> {
      const { data, error } = await getAdminClient()
        .from("blog_sources")
        .select(BLOG_SOURCE_COLUMNS)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .returns<BlogSourceRow[]>();
      if (error) throw new Error(`blogSources.listActive failed: ${error.message}`);
      return (data ?? []).map(mapBlogSourceRow);
    },
    async list({ isActive }: { isActive?: boolean } = {}): Promise<BlogSource[]> {
      let query = getAdminClient()
        .from("blog_sources")
        .select(BLOG_SOURCE_COLUMNS)
        .order("created_at", { ascending: true });
      if (typeof isActive === "boolean") query = query.eq("is_active", isActive);
      const { data, error } = await query.returns<BlogSourceRow[]>();
      if (error) throw new Error(`blogSources.list failed: ${error.message}`);
      return (data ?? []).map(mapBlogSourceRow);
    },
    async getById(id: string): Promise<BlogSource | null> {
      const { data, error } = await getAdminClient()
        .from("blog_sources")
        .select(BLOG_SOURCE_COLUMNS)
        .eq("id", id)
        .maybeSingle<BlogSourceRow>();
      if (error) throw new Error(`blogSources.getById failed: ${error.message}`);
      return data ? mapBlogSourceRow(data) : null;
    },
    async upsert(source: BlogSource): Promise<BlogSource> {
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
        .select(BLOG_SOURCE_COLUMNS)
        .single<BlogSourceRow>();
      if (error) throw new Error(`blogSources.upsert failed: ${error.message}`);
      return mapBlogSourceRow(data);
    },
    async update(
      id: string,
      patch: Pick<BlogSource, "publisherId" | "feedUrl" | "kind">,
    ): Promise<BlogSource> {
      const { data, error } = await getAdminClient()
        .from("blog_sources")
        .update({
          publisher_id: patch.publisherId,
          feed_url: patch.feedUrl,
          kind: patch.kind,
        })
        .eq("id", id)
        .select(BLOG_SOURCE_COLUMNS)
        .single<BlogSourceRow>();
      if (error) {
        if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) {
          throw new Error("DUPLICATE_FEED_URL");
        }
        throw new Error(`blogSources.update failed: ${error.message}`);
      }
      return mapBlogSourceRow(data);
    },
    async setActive(id: string, isActive: boolean): Promise<void> {
      const { error } = await getAdminClient()
        .from("blog_sources")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw new Error(`blogSources.setActive failed: ${error.message}`);
    },
    async delete(id: string): Promise<void> {
      // Cascades to `posts` and `post_tags` via FK on delete cascade.
      const { error } = await getAdminClient()
        .from("blog_sources")
        .delete()
        .eq("id", id);
      if (error) throw new Error(`blogSources.delete failed: ${error.message}`);
    },
    async recordSuccess(sourceId: string, fetchedAt: string): Promise<void> {
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
    async recordFailure(sourceId: string, message: string, occurredAt: string): Promise<void> {
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
  },
  posts: {
    async list() {
      return todo("posts.list");
    },
    async getById() {
      return todo("posts.getById");
    },
    async getByCanonicalUrl() {
      return todo("posts.getByCanonicalUrl");
    },
    async insertMany() {
      return todo("posts.insertMany");
    },
    async attachTags() {
      return todo("posts.attachTags");
    },
    async trendingTop() {
      return todo("posts.trendingTop");
    },
    async setBody() {
      return todo("posts.setBody");
    },
    async setBodyFailed() {
      return todo("posts.setBodyFailed");
    },
  },
  tags: {
    async list() {
      return todo("tags.list");
    },
    async getBySlug() {
      return todo("tags.getBySlug");
    },
    async upsertMany() {
      return todo("tags.upsertMany");
    },
    async matchByKeywords() {
      return todo("tags.matchByKeywords");
    },
    async merge() {
      return todo("tags.merge");
    },
  },
  profiles: {
    async getById(userId: string): Promise<Profile | null> {
      const { data, error } = await getAdminClient()
        .from("profiles")
        .select("user_id,email,display_name,role,is_banned,created_at")
        .eq("user_id", userId)
        .maybeSingle<ProfileRow>();
      if (error) throw new Error(`profiles.getById failed: ${error.message}`);
      return data ? mapProfileRow(data) : null;
    },
    async upsert(profile: Profile): Promise<Profile> {
      const { data, error } = await getAdminClient()
        .from("profiles")
        .upsert(
          {
            user_id: profile.userId,
            email: profile.email,
            display_name: profile.displayName,
            role: profile.role,
            is_banned: profile.isBanned,
            created_at: profile.createdAt,
          },
          { onConflict: "user_id" },
        )
        .select("user_id,email,display_name,role,is_banned,created_at")
        .single<ProfileRow>();
      if (error) throw new Error(`profiles.upsert failed: ${error.message}`);
      return mapProfileRow(data);
    },
    /**
     * Update a profile's role. Uses the service-role client because the
     * RLS `profiles_self_update` policy only allows users to mutate
     * their OWN row — admin-on-other-user updates must bypass RLS, with
     * application-level guards (see `setUserRoleAction`) plus an audit
     * log entry providing accountability.
     */
    async setRole(userId: string, role: UserRole): Promise<void> {
      const { error } = await getAdminClient()
        .from("profiles")
        .update({ role })
        .eq("user_id", userId);
      if (error) throw new Error(`profiles.setRole failed: ${error.message}`);
    },
    async setBanned(userId: string, isBanned: boolean): Promise<void> {
      const { error } = await getAdminClient()
        .from("profiles")
        .update({ is_banned: isBanned })
        .eq("user_id", userId);
      if (error) throw new Error(`profiles.setBanned failed: ${error.message}`);
    },
    async list({ role }: { role?: UserRole } = {}): Promise<Profile[]> {
      let query = getAdminClient()
        .from("profiles")
        .select("user_id,email,display_name,role,is_banned,created_at")
        .order("created_at", { ascending: false });
      if (role) query = query.eq("role", role);
      const { data, error } = await query.returns<ProfileRow[]>();
      if (error) throw new Error(`profiles.list failed: ${error.message}`);
      return (data ?? []).map(mapProfileRow);
    },
  },
  bookmarks: {
    async listForUser() {
      return todo("bookmarks.listForUser");
    },
    async toggle() {
      return todo("bookmarks.toggle");
    },
    async has() {
      return todo("bookmarks.has");
    },
    async bulkHas() {
      return todo("bookmarks.bulkHas");
    },
    async raw() {
      return todo("bookmarks.raw");
    },
  },
  follows: {
    async listFollowedPublishers() {
      return todo("follows.listFollowedPublishers");
    },
    async listFollowedTags() {
      return todo("follows.listFollowedTags");
    },
    async togglePublisher() {
      return todo("follows.togglePublisher");
    },
    async toggleTag() {
      return todo("follows.toggleTag");
    },
    async rawPublishers() {
      return todo("follows.rawPublishers");
    },
    async rawTags() {
      return todo("follows.rawTags");
    },
  },
  digest: {
    async getPreferences() {
      return todo("digest.getPreferences");
    },
    async setPreferences() {
      return todo("digest.setPreferences");
    },
    async selectRecipients() {
      return todo("digest.selectRecipients");
    },
    async recordSent() {
      return todo("digest.recordSent");
    },
  },
  suggestions: {
    async listForUser() {
      return todo("suggestions.listForUser");
    },
    async listByStatus() {
      return todo("suggestions.listByStatus");
    },
    async getById() {
      return todo("suggestions.getById");
    },
    async insert() {
      return todo("suggestions.insert");
    },
    async countPendingForUser() {
      return todo("suggestions.countPendingForUser");
    },
    async countLastWeekForUser() {
      return todo("suggestions.countLastWeekForUser");
    },
    async decide() {
      return todo("suggestions.decide");
    },
  },
  readEvents: {
    async insert() {
      return todo("readEvents.insert");
    },
    async countTotal() {
      return todo("readEvents.countTotal");
    },
    async countByDay() {
      return todo("readEvents.countByDay");
    },
    async countByPublisher() {
      return todo("readEvents.countByPublisher");
    },
    async countByAccess() {
      return todo("readEvents.countByAccess");
    },
  },
  audit: {
    async insert() {
      return todo("audit.insert");
    },
    async list() {
      return todo("audit.list");
    },
  },
};
