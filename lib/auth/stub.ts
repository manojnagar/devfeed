/**
 * @file Stub auth adapter.
 *
 * Stores the active session in a single httpOnly cookie. Provides
 * convenience helpers `signInAsDemoUser()` and `signInAsDemoAdmin()`
 * so the dev experience matches what a real OAuth flow would deliver.
 *
 * Never used in production — `AUTH_ADAPTER=stub` is the dev / test
 * setting only. The production-equivalent lives in `./supabase.ts`.
 */

import { cookies } from "next/headers";
import { getRepository } from "../data";
import type { Profile } from "../types";
import type { AuthAdapter, AuthSession } from "./types";

const COOKIE = "df_stub_session";

interface StubCookieValue {
  userId: string;
  expiresAt: string;
}

async function readCookie(): Promise<StubCookieValue | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StubCookieValue;
  } catch {
    return null;
  }
}

async function writeCookie(value: StubCookieValue): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function clearCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function loadProfile(userId: string): Promise<Profile | null> {
  return getRepository().profiles.getById(userId);
}

function buildSession(profile: Profile): AuthSession {
  const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
  return { user: profile, expiresAt };
}

async function signInAs(userId: string): Promise<void> {
  const profile = await loadProfile(userId);
  if (!profile) throw new Error(`Stub auth: profile ${userId} not found in seed.`);
  await writeCookie({ userId, expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString() });
}

export const stubAuth: AuthAdapter = {
  async getSession() {
    const cookie = await readCookie();
    if (!cookie) return null;
    const profile = await loadProfile(cookie.userId);
    if (!profile) return null;
    return { user: profile, expiresAt: cookie.expiresAt };
  },
  async signInWithMagicLink({ email }) {
    const repo = getRepository();
    const profiles = await repo.profiles.list();
    const found = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      return { ok: false, error: "Stub auth only knows about the seeded demo accounts." };
    }
    await signInAs(found.userId);
    return { ok: true };
  },
  async getOAuthUrl({ redirectTo }) {
    return redirectTo ?? "/me/digest";
  },
  async signInAsDemoUser() {
    await signInAs("demo-user");
  },
  async signInAsDemoAdmin() {
    await signInAs("demo-admin-user");
  },
  async promoteCurrentToAdmin() {
    const session = await this.getSession();
    if (!session) throw new Error("No active session to promote.");
    await getRepository().profiles.setRole(session.user.userId, "admin");
  },
  async signOut() {
    await clearCookie();
  },
};

export function buildSessionFromProfile(profile: Profile): AuthSession {
  return buildSession(profile);
}
