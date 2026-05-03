/**
 * @file Supabase SuggestionRepository implementation.
 *
 * Submit (insert) is allowed under `suggestions_self_insert` RLS for
 * authenticated users; admin update is gated by `suggestions_admin_update`
 * via the `is_admin()` helper from migration 0003. We use the
 * service-role client throughout for consistency with other modules,
 * with action-layer `requireUser()` / `requireAdmin()` guards.
 */

import type {
  PublisherSuggestion,
  PublisherType,
  SourceKind,
  SuggestionStatus,
} from "../../../types";
import type { SuggestionRepository } from "../../types";
import { getAdminClient } from "../clients";

interface SuggestionRow {
  id: string;
  submitted_by_user_id: string;
  type: PublisherType;
  name: string;
  website_url: string;
  feed_url: string | null;
  feed_kind: SourceKind | null;
  reason: string | null;
  auto_validation: PublisherSuggestion["autoValidation"];
  status: SuggestionStatus;
  reviewed_by_user_id: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS =
  "id,submitted_by_user_id,type,name,website_url,feed_url,feed_kind,reason,auto_validation,status,reviewed_by_user_id,reviewer_notes,created_at,updated_at";

function mapRow(row: SuggestionRow): PublisherSuggestion {
  return {
    id: row.id,
    submittedByUserId: row.submitted_by_user_id,
    type: row.type,
    name: row.name,
    websiteUrl: row.website_url,
    feedUrl: row.feed_url,
    feedKind: row.feed_kind,
    reason: row.reason,
    autoValidation: row.auto_validation,
    status: row.status,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewerNotes: row.reviewer_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const supabaseSuggestionRepo: SuggestionRepository = {
  async listForUser(userId) {
    const { data, error } = await getAdminClient()
      .from("publisher_suggestions")
      .select(COLUMNS)
      .eq("submitted_by_user_id", userId)
      .order("created_at", { ascending: false })
      .returns<SuggestionRow[]>();
    if (error) throw new Error(`suggestions.listForUser failed: ${error.message}`);
    return (data ?? []).map(mapRow);
  },
  async listByStatus(status) {
    const { data, error } = await getAdminClient()
      .from("publisher_suggestions")
      .select(COLUMNS)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .returns<SuggestionRow[]>();
    if (error) throw new Error(`suggestions.listByStatus failed: ${error.message}`);
    return (data ?? []).map(mapRow);
  },
  async getById(id) {
    const { data, error } = await getAdminClient()
      .from("publisher_suggestions")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle<SuggestionRow>();
    if (error) throw new Error(`suggestions.getById failed: ${error.message}`);
    return data ? mapRow(data) : null;
  },
  async insert(suggestion) {
    const { data, error } = await getAdminClient()
      .from("publisher_suggestions")
      .insert({
        id: suggestion.id,
        submitted_by_user_id: suggestion.submittedByUserId,
        type: suggestion.type,
        name: suggestion.name,
        website_url: suggestion.websiteUrl,
        feed_url: suggestion.feedUrl,
        feed_kind: suggestion.feedKind,
        reason: suggestion.reason,
        auto_validation: suggestion.autoValidation,
        status: suggestion.status,
        reviewed_by_user_id: suggestion.reviewedByUserId,
        reviewer_notes: suggestion.reviewerNotes,
        created_at: suggestion.createdAt,
        updated_at: suggestion.updatedAt,
      })
      .select(COLUMNS)
      .single<SuggestionRow>();
    if (error) throw new Error(`suggestions.insert failed: ${error.message}`);
    return mapRow(data);
  },
  async countPendingForUser(userId) {
    const { count, error } = await getAdminClient()
      .from("publisher_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by_user_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(`suggestions.countPendingForUser failed: ${error.message}`);
    return count ?? 0;
  },
  async countLastWeekForUser(userId) {
    const cutoff = new Date(Date.now() - ONE_WEEK_MS).toISOString();
    const { count, error } = await getAdminClient()
      .from("publisher_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by_user_id", userId)
      .gte("created_at", cutoff);
    if (error) throw new Error(`suggestions.countLastWeekForUser failed: ${error.message}`);
    return count ?? 0;
  },
  async decide(suggestionId, decision: SuggestionStatus, reviewerId, reviewerNotes) {
    const { data, error } = await getAdminClient()
      .from("publisher_suggestions")
      .update({
        status: decision,
        reviewed_by_user_id: reviewerId,
        reviewer_notes: reviewerNotes,
      })
      .eq("id", suggestionId)
      .select(COLUMNS)
      .single<SuggestionRow>();
    if (error) {
      if (error.code === "PGRST116") {
        throw new Error(`Suggestion ${suggestionId} not found`);
      }
      throw new Error(`suggestions.decide failed: ${error.message}`);
    }
    return mapRow(data);
  },
};
