/**
 * @file Supabase client factories.
 *
 * Three flavours of client, intentionally separated so misuse fails
 * loudly per the workspace data-and-storage-security rule:
 *
 * - `getBrowserClient()` — anon key, runs in the browser, RLS enforced.
 * - `getServerClient()` — anon key, runs on the server with SSR cookies.
 * - `getAdminClient()` — service-role key, server-only, bypasses RLS.
 *   MUST NEVER be imported in a client component.
 *
 * Credentials come from env vars only (the `getEnv` helper) — nothing
 * is hard-coded here, complying with the workspace
 * `hardcoded-credentials-block` rule.
 */

import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createCoreClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../../env";

let browserCached: SupabaseClient | null = null;
let adminCached: SupabaseClient | null = null;

/** Anon-key client for use inside client components. */
export function getBrowserClient(): SupabaseClient {
  if (browserCached) return browserCached;
  const env = getEnv();
  browserCached = createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return browserCached;
}

export interface ServerCookieAdapter {
  get(name: string): string | undefined;
  set(name: string, value: string, options: CookieOptions): void;
  remove(name: string, options: CookieOptions): void;
}

/**
 * Anon-key client for server components / Route Handlers / Server Actions.
 *
 * Caller passes a cookie adapter (typically backed by `next/headers`'s
 * `cookies()` helper) so the SSR session cookies refresh correctly.
 */
export function getServerClient(cookies: ServerCookieAdapter): SupabaseClient {
  const env = getEnv();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookies.get(name),
        set: (name, value, options) => cookies.set(name, value, options),
        remove: (name, options) => cookies.remove(name, options),
      },
    },
  );
}

/**
 * Service-role client. Server-only, bypasses RLS. Use ONLY in trusted
 * server-side code (cron jobs, ingestion pipeline, admin Server Actions).
 *
 * Throws if accidentally invoked on the client.
 */
export function getAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "getAdminClient() must never be called in the browser. Use getBrowserClient() instead.",
    );
  }
  if (adminCached) return adminCached;
  const env = getEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      "Supabase service-role client requested but SUPABASE_SERVICE_ROLE_KEY is not configured.",
    );
  }
  adminCached = createCoreClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminCached;
}

/** Test-only — wipe cached clients between runs. */
export function __resetSupabaseClientCaches(): void {
  browserCached = null;
  adminCached = null;
}
