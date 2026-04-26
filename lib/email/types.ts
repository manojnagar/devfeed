/**
 * @file Email adapter contract.
 *
 * Two implementations:
 *   - `console` — pretty-prints emails to stdout (default in dev/test).
 *   - `resend`  — POSTs to the Resend HTTP API.
 *
 * Templates render to `{ subject, html, text }` first, then the
 * adapter delivers. Keeps templates pure (testable) and adapters thin.
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendInput {
  to: EmailRecipient | EmailRecipient[];
  rendered: RenderedEmail;
  from?: string;
  replyTo?: string;
  tag?: string;
}

export interface EmailAdapter {
  send(input: EmailSendInput): Promise<{ id: string } | { error: string }>;
}
