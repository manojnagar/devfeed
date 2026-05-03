/**
 * @file Supabase ReadEventRepository + AuditRepository.
 *
 * Read events use the materialized view `reads_by_publisher_30d`
 * (migration 0005) for the by-publisher rollup when `days === 30` —
 * other windows fall back to an ad-hoc aggregation. The same pattern
 * applies to the trending top, kept inside `posts.ts`.
 *
 * `audit_log` is service-role-only by design: the table has no
 * INSERT/UPDATE policy for `authenticated`, only the `audit_log_admin_read`
 * SELECT policy. All writes flow through this adapter.
 */

import type { AccessLabel, AuditLog, ReadEvent } from "../../../types";
import type { AuditRepository, ReadEventRepository } from "../../types";
import { getAdminClient } from "../clients";

interface AuditRow {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  payload: Record<string, unknown>;
  occurred_at: string;
}

function mapAuditRow(row: AuditRow): AuditLog {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    payload: row.payload,
    occurredAt: row.occurred_at,
  };
}

export const supabaseReadEventRepo: ReadEventRepository = {
  async insert(event: ReadEvent) {
    const { error } = await getAdminClient().from("read_events").insert({
      id: event.id,
      post_id: event.postId,
      user_id: event.userId,
      anon_id: event.anonId,
      ip_hash: event.ipHash,
      ua_hash: event.uaHash,
      referrer: event.referrer,
      occurred_at: event.occurredAt,
    });
    if (error) throw new Error(`readEvents.insert failed: ${error.message}`);
  },
  async countTotal() {
    const { count, error } = await getAdminClient()
      .from("read_events")
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(`readEvents.countTotal failed: ${error.message}`);
    return count ?? 0;
  },
  async countByDay(days) {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data, error } = await getAdminClient()
      .from("read_events")
      .select("occurred_at")
      .gte("occurred_at", cutoff)
      .returns<{ occurred_at: string }[]>();
    if (error) throw new Error(`readEvents.countByDay failed: ${error.message}`);
    const buckets = new Map<string, number>();
    for (const row of data ?? []) {
      const day = row.occurred_at.slice(0, 10);
      buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  },
  async countByPublisher(days, limit) {
    if (days === 30) {
      const { data, error } = await getAdminClient()
        .from("reads_by_publisher_30d")
        .select("publisher_id,read_count")
        .order("read_count", { ascending: false })
        .limit(limit)
        .returns<{ publisher_id: string; read_count: number }[]>();
      if (error) {
        throw new Error(`readEvents.countByPublisher failed (view): ${error.message}`);
      }
      return (data ?? [])
        .filter((r) => r.read_count > 0)
        .map((r) => ({ publisherId: r.publisher_id, count: Number(r.read_count) }));
    }

    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data: events, error: evErr } = await getAdminClient()
      .from("read_events")
      .select("post_id,occurred_at")
      .gte("occurred_at", cutoff)
      .returns<{ post_id: string; occurred_at: string }[]>();
    if (evErr) throw new Error(`readEvents.countByPublisher failed: ${evErr.message}`);
    const postIds = Array.from(new Set((events ?? []).map((e) => e.post_id)));
    if (postIds.length === 0) return [];
    const { data: posts, error: postErr } = await getAdminClient()
      .from("posts")
      .select("id,publisher_id")
      .in("id", postIds)
      .returns<{ id: string; publisher_id: string }[]>();
    if (postErr) {
      throw new Error(`readEvents.countByPublisher failed (posts): ${postErr.message}`);
    }
    const postToPublisher = new Map((posts ?? []).map((p) => [p.id, p.publisher_id]));
    const counts = new Map<string, number>();
    for (const ev of events ?? []) {
      const publisherId = postToPublisher.get(ev.post_id);
      if (!publisherId) continue;
      counts.set(publisherId, (counts.get(publisherId) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([publisherId, count]) => ({ publisherId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
  async countByAccess(days) {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data: events, error: evErr } = await getAdminClient()
      .from("read_events")
      .select("post_id,occurred_at")
      .gte("occurred_at", cutoff)
      .returns<{ post_id: string; occurred_at: string }[]>();
    if (evErr) throw new Error(`readEvents.countByAccess failed: ${evErr.message}`);
    const postIds = Array.from(new Set((events ?? []).map((e) => e.post_id)));
    if (postIds.length === 0) return [];
    const { data: posts, error: postErr } = await getAdminClient()
      .from("posts")
      .select("id,access_label")
      .in("id", postIds)
      .returns<{ id: string; access_label: AccessLabel }[]>();
    if (postErr) throw new Error(`readEvents.countByAccess failed (posts): ${postErr.message}`);
    const postToAccess = new Map((posts ?? []).map((p) => [p.id, p.access_label]));
    const counts = new Map<AccessLabel, number>();
    for (const ev of events ?? []) {
      const access = postToAccess.get(ev.post_id);
      if (!access) continue;
      counts.set(access, (counts.get(access) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([accessLabel, count]) => ({ accessLabel, count }));
  },
};

export const supabaseAuditRepo: AuditRepository = {
  async insert(entry) {
    const { error } = await getAdminClient().from("audit_log").insert({
      id: entry.id,
      actor_user_id: entry.actorUserId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      payload: entry.payload,
      occurred_at: entry.occurredAt,
    });
    if (error) throw new Error(`audit.insert failed: ${error.message}`);
  },
  async list(limit) {
    const { data, error } = await getAdminClient()
      .from("audit_log")
      .select("id,actor_user_id,action,target_type,target_id,payload,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(limit)
      .returns<AuditRow[]>();
    if (error) throw new Error(`audit.list failed: ${error.message}`);
    return (data ?? []).map(mapAuditRow);
  },
};
