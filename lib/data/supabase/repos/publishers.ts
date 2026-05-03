/**
 * @file Supabase PublisherRepository implementation.
 *
 * Reads use the service-role client for consistency with the rest of
 * the adapter — RLS policy `publishers_anon_read` (migration 0002)
 * already permits anon reads of active rows, but using one client
 * keeps the failure modes uniform across modules. Writes are admin-only
 * and rely on application-layer `requireAdmin()` enforcement.
 */

import type {
  AccessLabel,
  PaywallProvider,
  Publisher,
  PublisherType,
} from "../../../types";
import type { PublisherRepository } from "../../types";
import { getAdminClient } from "../clients";

interface PublisherRow {
  id: string;
  type: PublisherType;
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

export const PUBLISHER_COLUMNS =
  "id,type,slug,name,website_url,description,logo_url,twitter_handle,github_handle,home_country,default_access_label,default_paywall_provider,is_verified,is_active,created_at,updated_at";

export function mapPublisherRow(row: PublisherRow): Publisher {
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    name: row.name,
    websiteUrl: row.website_url,
    description: row.description,
    logoUrl: row.logo_url,
    twitterHandle: row.twitter_handle,
    githubHandle: row.github_handle,
    homeCountry: row.home_country,
    defaultAccessLabel: row.default_access_label,
    defaultPaywallProvider: row.default_paywall_provider,
    isVerified: row.is_verified,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const supabasePublisherRepo: PublisherRepository = {
  async list({ type, isActive } = {}) {
    let query = getAdminClient()
      .from("publishers")
      .select(PUBLISHER_COLUMNS)
      .order("name", { ascending: true });
    if (type && type.length > 0) query = query.in("type", type);
    if (typeof isActive === "boolean") query = query.eq("is_active", isActive);
    const { data, error } = await query.returns<PublisherRow[]>();
    if (error) throw new Error(`publishers.list failed: ${error.message}`);
    return (data ?? []).map(mapPublisherRow);
  },
  async getBySlug(slug) {
    const { data, error } = await getAdminClient()
      .from("publishers")
      .select(PUBLISHER_COLUMNS)
      .eq("slug", slug)
      .maybeSingle<PublisherRow>();
    if (error) throw new Error(`publishers.getBySlug failed: ${error.message}`);
    return data ? mapPublisherRow(data) : null;
  },
  async getById(id) {
    const { data, error } = await getAdminClient()
      .from("publishers")
      .select(PUBLISHER_COLUMNS)
      .eq("id", id)
      .maybeSingle<PublisherRow>();
    if (error) throw new Error(`publishers.getById failed: ${error.message}`);
    return data ? mapPublisherRow(data) : null;
  },
  async upsert(publisher) {
    const { data, error } = await getAdminClient()
      .from("publishers")
      .upsert(
        {
          id: publisher.id,
          type: publisher.type,
          slug: publisher.slug,
          name: publisher.name,
          website_url: publisher.websiteUrl,
          description: publisher.description,
          logo_url: publisher.logoUrl,
          twitter_handle: publisher.twitterHandle,
          github_handle: publisher.githubHandle,
          home_country: publisher.homeCountry,
          default_access_label: publisher.defaultAccessLabel,
          default_paywall_provider: publisher.defaultPaywallProvider,
          is_verified: publisher.isVerified,
          is_active: publisher.isActive,
          created_at: publisher.createdAt,
          updated_at: publisher.updatedAt,
        },
        { onConflict: "id" },
      )
      .select(PUBLISHER_COLUMNS)
      .single<PublisherRow>();
    if (error) throw new Error(`publishers.upsert failed: ${error.message}`);
    return mapPublisherRow(data);
  },
  async setActive(id, isActive) {
    const { error } = await getAdminClient()
      .from("publishers")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw new Error(`publishers.setActive failed: ${error.message}`);
  },
  async delete(id) {
    const { error } = await getAdminClient().from("publishers").delete().eq("id", id);
    if (error) throw new Error(`publishers.delete failed: ${error.message}`);
  },
};
