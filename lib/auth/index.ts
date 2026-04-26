/**
 * @file Auth adapter factory + role guards.
 *
 * `getAuth()` returns the configured adapter (stub for dev, supabase
 * for production). `requireUser` / `requireAdmin` are the standard
 * helpers Server Components and Route Handlers call to enforce auth —
 * they redirect / 404 when access is denied.
 */

import { notFound, redirect } from "next/navigation";
import { getEnv } from "../env";
import type { AuthAdapter, AuthSession } from "./types";
import { stubAuth } from "./stub";
import { supabaseAuth } from "./supabase";

let cached: AuthAdapter | null = null;

export function getAuth(): AuthAdapter {
  if (cached) return cached;
  const env = getEnv();
  cached = env.AUTH_ADAPTER === "supabase" ? supabaseAuth : stubAuth;
  return cached;
}

/** Test-only — drop the cached adapter instance. */
export function __resetAuthCache(): void {
  cached = null;
}

/**
 * Get the current session or redirect to /login.
 *
 * Used at the top of every protected Server Component.
 */
export async function requireUser(returnTo?: string): Promise<AuthSession> {
  const session = await getAuth().getSession();
  if (!session) {
    const next = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${next}`);
  }
  return session;
}

/**
 * Get the current admin session or 404 (intentionally never 403 — we
 * don't want to reveal that admin pages exist).
 */
export async function requireAdmin(): Promise<AuthSession> {
  const session = await getAuth().getSession();
  if (!session || session.user.role !== "admin" || session.user.isBanned) {
    notFound();
  }
  return session;
}

/** Get the session without enforcing — for components that adapt to auth state. */
export async function getOptionalSession(): Promise<AuthSession | null> {
  return getAuth().getSession();
}

export type { AuthAdapter, AuthSession } from "./types";
