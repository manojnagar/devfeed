/**
 * @file Supabase Auth adapter.
 *
 * Production implementation. Mirrors the surface of `./stub.ts` so the
 * rest of the codebase never branches on adapter. Cookie handling is
 * delegated to `@supabase/ssr`'s `createServerClient`, which writes
 * the auth cookies on every refresh.
 */

import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
import { getServerClient } from "../data/supabase/clients";
import type { Profile } from "../types";
import type { AuthAdapter, AuthSession } from "./types";
import { getEnv } from "../env";

async function adapter() {
  const jar = await cookies();
  return {
    get: (name: string) => jar.get(name)?.value,
    set: (name: string, value: string, options: CookieOptions) =>
      jar.set({ name, value, ...options }),
    remove: (name: string, options: CookieOptions) =>
      jar.set({ name, value: "", ...options, maxAge: 0 }),
  };
}

function fromUserMetadata(user: {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: { name?: string };
}): Profile {
  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: user.user_metadata?.name ?? null,
    role: "user",
    isBanned: false,
    createdAt: user.created_at ?? new Date().toISOString(),
  };
}

export const supabaseAuth: AuthAdapter = {
  async getSession() {
    const sb = getServerClient(await adapter());
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    const profile = fromUserMetadata(data.user);
    return { user: profile, expiresAt: new Date(Date.now() + 60 * 60_000).toISOString() } satisfies AuthSession;
  },
  async signInWithMagicLink({ email, redirectTo }) {
    const sb = getServerClient(await adapter());
    const env = getEnv();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo ?? `${env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  },
  async getOAuthUrl({ provider, redirectTo }) {
    const sb = getServerClient(await adapter());
    const env = getEnv();
    const { data, error } = await sb.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo ?? `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });
    if (error || !data.url) throw new Error(error?.message ?? "OAuth URL generation failed");
    return data.url;
  },
  async signOut() {
    const sb = getServerClient(await adapter());
    await sb.auth.signOut();
  },
};
