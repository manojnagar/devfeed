/**
 * @file Supabase DigestRepository implementation.
 *
 * `getPreferences` lazily creates a default row on first access so the
 * /me/digest page can always render. Schema defaults match the in-memory
 * adapter's `DEFAULT_PREFS` constant, kept in sync via migration 0003.
 *
 * `selectRecipients` uses Postgres `extract(hour from timezone('UTC', ...))`
 * implicitly via the integer `preferred_hour_utc` column — we just match
 * on hour and (for weekly) on Monday (ISO day 1). Last-sent freshness is
 * NOT enforced here; the cron loop handles dedup via `recordSent`.
 */

import type {
  AccessLabel,
  DigestFrequency,
  DigestPreferences,
} from "../../../types";
import type { DigestRepository } from "../../types";
import { getAdminClient } from "../clients";

interface DigestPrefsRow {
  user_id: string;
  frequency: DigestFrequency;
  preferred_hour_utc: number;
  include_followed_publishers: boolean;
  include_followed_tags: boolean;
  include_access_labels: AccessLabel[];
  max_posts_per_email: number;
  last_sent_at: string | null;
}

const COLUMNS =
  "user_id,frequency,preferred_hour_utc,include_followed_publishers,include_followed_tags,include_access_labels,max_posts_per_email,last_sent_at";

const DEFAULT_PREFS = {
  frequency: "weekly" as DigestFrequency,
  preferred_hour_utc: 13,
  include_followed_publishers: true,
  include_followed_tags: true,
  include_access_labels: ["free", "paid", "members_only", "mixed"] as AccessLabel[],
  max_posts_per_email: 12,
  last_sent_at: null as string | null,
};

function mapRow(row: DigestPrefsRow): DigestPreferences {
  return {
    userId: row.user_id,
    frequency: row.frequency,
    preferredHourUtc: row.preferred_hour_utc,
    includeFollowedPublishers: row.include_followed_publishers,
    includeFollowedTags: row.include_followed_tags,
    includeAccessLabels: row.include_access_labels,
    maxPostsPerEmail: row.max_posts_per_email,
    lastSentAt: row.last_sent_at,
  };
}

export const supabaseDigestRepo: DigestRepository = {
  async getPreferences(userId) {
    const admin = getAdminClient();
    const existing = await admin
      .from("digest_preferences")
      .select(COLUMNS)
      .eq("user_id", userId)
      .maybeSingle<DigestPrefsRow>();
    if (existing.error) {
      throw new Error(`digest.getPreferences failed: ${existing.error.message}`);
    }
    if (existing.data) return mapRow(existing.data);
    const { data, error } = await admin
      .from("digest_preferences")
      .insert({ user_id: userId, ...DEFAULT_PREFS })
      .select(COLUMNS)
      .single<DigestPrefsRow>();
    if (error) throw new Error(`digest.getPreferences failed (insert): ${error.message}`);
    return mapRow(data);
  },
  async setPreferences(prefs) {
    const { data, error } = await getAdminClient()
      .from("digest_preferences")
      .upsert(
        {
          user_id: prefs.userId,
          frequency: prefs.frequency,
          preferred_hour_utc: prefs.preferredHourUtc,
          include_followed_publishers: prefs.includeFollowedPublishers,
          include_followed_tags: prefs.includeFollowedTags,
          include_access_labels: prefs.includeAccessLabels,
          max_posts_per_email: prefs.maxPostsPerEmail,
          last_sent_at: prefs.lastSentAt,
        },
        { onConflict: "user_id" },
      )
      .select(COLUMNS)
      .single<DigestPrefsRow>();
    if (error) throw new Error(`digest.setPreferences failed: ${error.message}`);
    return mapRow(data);
  },
  async selectRecipients(now: Date) {
    const hour = now.getUTCHours();
    const isMonday = now.getUTCDay() === 1;
    let query = getAdminClient()
      .from("digest_preferences")
      .select(COLUMNS)
      .neq("frequency", "off")
      .eq("preferred_hour_utc", hour);
    if (!isMonday) query = query.eq("frequency", "daily");
    const { data, error } = await query.returns<DigestPrefsRow[]>();
    if (error) throw new Error(`digest.selectRecipients failed: ${error.message}`);
    return (data ?? []).map(mapRow);
  },
  async recordSent(userId, sentAt, _postIds) {
    const { error } = await getAdminClient()
      .from("digest_preferences")
      .update({ last_sent_at: sentAt })
      .eq("user_id", userId);
    if (error) throw new Error(`digest.recordSent failed: ${error.message}`);
  },
};
