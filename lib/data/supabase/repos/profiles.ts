/**
 * @file Supabase ProfileRepository implementation.
 *
 * Profiles mirror `auth.users` via the `handle_new_user` trigger
 * defined in migration 0003. Reads honor the `profiles_self_read`
 * RLS policy when invoked through user-scoped clients; admin writes
 * (role / banned changes) bypass RLS via the service-role client and
 * rely on application-layer `requireAdmin()` + audit logging.
 */

import type { Profile, UserRole } from "../../../types";
import type { ProfileRepository } from "../../types";
import { getAdminClient } from "../clients";

interface ProfileRow {
  user_id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  is_banned: boolean;
  created_at: string;
}

const COLUMNS = "user_id,email,display_name,role,is_banned,created_at";

function mapRow(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isBanned: row.is_banned,
    createdAt: row.created_at,
  };
}

export const supabaseProfileRepo: ProfileRepository = {
  async getById(userId) {
    const { data, error } = await getAdminClient()
      .from("profiles")
      .select(COLUMNS)
      .eq("user_id", userId)
      .maybeSingle<ProfileRow>();
    if (error) throw new Error(`profiles.getById failed: ${error.message}`);
    return data ? mapRow(data) : null;
  },
  async upsert(profile) {
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
      .select(COLUMNS)
      .single<ProfileRow>();
    if (error) throw new Error(`profiles.upsert failed: ${error.message}`);
    return mapRow(data);
  },
  async setRole(userId, role) {
    const { error } = await getAdminClient()
      .from("profiles")
      .update({ role })
      .eq("user_id", userId);
    if (error) throw new Error(`profiles.setRole failed: ${error.message}`);
  },
  async setBanned(userId, isBanned) {
    const { error } = await getAdminClient()
      .from("profiles")
      .update({ is_banned: isBanned })
      .eq("user_id", userId);
    if (error) throw new Error(`profiles.setBanned failed: ${error.message}`);
  },
  async list({ role } = {}) {
    let query = getAdminClient()
      .from("profiles")
      .select(COLUMNS)
      .order("created_at", { ascending: false });
    if (role) query = query.eq("role", role);
    const { data, error } = await query.returns<ProfileRow[]>();
    if (error) throw new Error(`profiles.list failed: ${error.message}`);
    return (data ?? []).map(mapRow);
  },
};
