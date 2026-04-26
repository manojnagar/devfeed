/**
 * @file Resend email adapter.
 *
 * Thin POST wrapper over the Resend HTTP API. We deliberately don't
 * pull in the full `resend` SDK to keep the bundle small and to make
 * the integration easier to mock in tests.
 */

import { getEnv } from "../env";
import { log } from "../log";
import type { EmailAdapter, EmailSendInput } from "./types";

const ENDPOINT = "https://api.resend.com/emails";

function payload(input: EmailSendInput): Record<string, unknown> {
  const env = getEnv();
  const recipients = (Array.isArray(input.to) ? input.to : [input.to]).map(
    (r) => (r.name ? `${r.name} <${r.email}>` : r.email),
  );
  return {
    from: input.from ?? env.RESEND_FROM ?? "DevFeed <noreply@devfeed.example>",
    to: recipients,
    reply_to: input.replyTo,
    subject: input.rendered.subject,
    html: input.rendered.html,
    text: input.rendered.text,
    tags: input.tag ? [{ name: "category", value: input.tag }] : undefined,
  };
}

export const resendEmail: EmailAdapter = {
  async send(input) {
    const env = getEnv();
    if (!env.RESEND_API_KEY) {
      return { error: "RESEND_API_KEY is not configured" };
    }
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload(input)),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        log.error("email_send_failed", { adapter: "resend", status: res.status, body: text });
        return { error: `Resend returned ${res.status}` };
      }
      const data = (await res.json()) as { id: string };
      log.info("email_sent", { adapter: "resend", id: data.id, subject: input.rendered.subject });
      return { id: data.id };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error("email_send_exception", { adapter: "resend", error });
      return { error };
    }
  },
};
