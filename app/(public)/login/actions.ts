/**
 * @file Server Actions for login flows.
 *
 * Wraps the AuthAdapter behind safe, validated entry points the login
 * page can call from `<form action={...}>`. The stub adapter does not
 * perform real OAuth; it just signs in as the seeded demo user/admin.
 */

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { log } from "@/lib/log";

const EmailSchema = z.string().trim().email();

/** Sign in via the configured adapter using a magic link. */
export async function signInWithEmailAction(formData: FormData): Promise<void> {
  const parsed = EmailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    redirect("/login?error=invalid_email");
  }
  const auth = getAuth();
  const result = await auth.signInWithMagicLink({ email: parsed.data });
  if (!result.ok) {
    log.warn("login_failed", { reason: result.error });
    redirect(`/login?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/me/digest");
}

/** Stub-only: sign in as the demo user account. */
export async function signInAsDemoUserAction(): Promise<void> {
  const auth = getAuth();
  if (!auth.signInAsDemoUser) redirect("/login?error=demo_unavailable");
  await auth.signInAsDemoUser();
  redirect("/me/digest");
}

/** Stub-only: sign in as the demo admin account. */
export async function signInAsDemoAdminAction(): Promise<void> {
  const auth = getAuth();
  if (!auth.signInAsDemoAdmin) redirect("/login?error=demo_unavailable");
  await auth.signInAsDemoAdmin();
  redirect("/admin/overview");
}

/** Sign out the current session. */
export async function signOutAction(): Promise<void> {
  await getAuth().signOut();
  redirect("/");
}
