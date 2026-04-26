/**
 * @file Console email adapter — prints rendered emails to stdout.
 *
 * Used in dev mode and tests. Output is structured so it's easy to
 * grep for in terminal logs (`event: email_sent`).
 */

import { genId } from "../ids";
import { log } from "../log";
import type { EmailAdapter, EmailSendInput } from "./types";

function listRecipients(to: EmailSendInput["to"]): string[] {
  return (Array.isArray(to) ? to : [to]).map((r) => (r.name ? `${r.name} <${r.email}>` : r.email));
}

export const consoleEmail: EmailAdapter = {
  async send(input) {
    const id = genId();
    const recipients = listRecipients(input.to);
    log.info("email_sent", {
      adapter: "console",
      id,
      to: recipients,
      from: input.from,
      subject: input.rendered.subject,
      tag: input.tag,
      previewText: input.rendered.text.slice(0, 200),
    });
    return { id };
  },
};
