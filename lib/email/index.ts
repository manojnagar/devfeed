/**
 * @file Email adapter factory.
 *
 * `getEmail()` returns the configured adapter. Templates live next to
 * this file in `templates/` and produce a `RenderedEmail` that the
 * adapter delivers.
 */

import { getEnv } from "../env";
import { consoleEmail } from "./console";
import { resendEmail } from "./resend";
import type { EmailAdapter } from "./types";

let cached: EmailAdapter | null = null;

export function getEmail(): EmailAdapter {
  if (cached) return cached;
  const env = getEnv();
  cached = env.EMAIL_ADAPTER === "resend" ? resendEmail : consoleEmail;
  return cached;
}

export function __resetEmailCache(): void {
  cached = null;
}

export type { EmailAdapter, RenderedEmail, EmailSendInput, EmailRecipient } from "./types";
