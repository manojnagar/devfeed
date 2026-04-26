/**
 * @file Auth adapter contract.
 *
 * Two implementations: a stub for local dev / tests (auto-signs in as
 * a demo user) and a Supabase Auth adapter for production. Both expose
 * the same surface so the rest of the codebase never branches on
 * environment.
 */

import type { Profile } from "../types";

export interface AuthSession {
  user: Profile;
  expiresAt: string;
}

export interface SignInRequest {
  email: string;
  redirectTo?: string;
}

export interface OAuthRequest {
  provider: "google" | "github";
  redirectTo?: string;
}

export interface AuthAdapter {
  /** Returns the current session or null if anonymous. */
  getSession(): Promise<AuthSession | null>;
  /** Send an email magic link (no-op for the stub adapter). */
  signInWithMagicLink(input: SignInRequest): Promise<{ ok: true } | { ok: false; error: string }>;
  /** Returns a redirect URL for the chosen OAuth provider. */
  getOAuthUrl(input: OAuthRequest): Promise<string>;
  /** Switch the demo session to admin (stub-only convenience). */
  promoteCurrentToAdmin?(): Promise<void>;
  /** Sign the current user in as the seeded demo user (stub-only). */
  signInAsDemoUser?(): Promise<void>;
  /** Sign the current user in as the seeded demo admin (stub-only). */
  signInAsDemoAdmin?(): Promise<void>;
  /** Tear down the session. */
  signOut(): Promise<void>;
}
