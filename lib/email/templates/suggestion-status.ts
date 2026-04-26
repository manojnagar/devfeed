/**
 * @file Email template for suggestion status updates.
 *
 * Three variants — approved, rejected, needs_changes — produced by the
 * single `renderSuggestionStatusEmail` function.
 */

import type { PublisherSuggestion } from "../../types";
import type { RenderedEmail } from "../types";

export interface SuggestionStatusContext {
  suggestion: PublisherSuggestion;
  reviewerNotes: string | null;
  decision: "approve" | "reject" | "needs_changes";
  publisherSlug: string | null;
  siteUrl: string;
}

const COPY: Record<SuggestionStatusContext["decision"], { subject: string; greeting: string; body: string }> = {
  approve: {
    subject: "Your suggestion was approved",
    greeting: "Great news!",
    body: "We just published the publisher you suggested. Posts will start showing up within a few hours of the next ingest run.",
  },
  reject: {
    subject: "Your suggestion was declined",
    greeting: "Thanks for the suggestion.",
    body: "We weren't able to add this publisher to DevFeed. Details from the moderator are below — you're welcome to suggest a different one.",
  },
  needs_changes: {
    subject: "Action needed on your DevFeed suggestion",
    greeting: "Almost there.",
    body: "We need a small change before approving this one. The moderator's notes are below.",
  },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[c]!));
}

/** Build subject + bodies for a moderator decision email. */
export function renderSuggestionStatusEmail(ctx: SuggestionStatusContext): RenderedEmail {
  const copy = COPY[ctx.decision];
  const detailsLink =
    ctx.publisherSlug && ctx.decision === "approve"
      ? `${ctx.siteUrl}/publishers/${ctx.publisherSlug}`
      : `${ctx.siteUrl}/me/suggestions`;
  const notesBlock = ctx.reviewerNotes
    ? `<blockquote style="border-left:3px solid #555;padding:8px 12px;margin:16px 0;color:#444;background:#f6f6f8">${escapeHtml(ctx.reviewerNotes)}</blockquote>`
    : "";

  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#111">
  <h1 style="font-size:20px;margin:0 0 16px">${copy.greeting}</h1>
  <p style="font-size:15px;line-height:1.55;color:#333">${copy.body}</p>
  <p style="font-size:14px;color:#444">Suggestion: <strong>${escapeHtml(ctx.suggestion.name)}</strong></p>
  ${notesBlock}
  <p><a href="${detailsLink}" style="color:#2364eb">View details</a></p>
  <p style="font-size:12px;color:#888;margin-top:24px">— DevFeed</p>
</body></html>`;

  const text = `${copy.greeting}\n\n${copy.body}\n\nSuggestion: ${ctx.suggestion.name}\n${ctx.reviewerNotes ? `\nModerator notes:\n${ctx.reviewerNotes}\n` : ""}\nView: ${detailsLink}\n`;

  return { subject: copy.subject, html, text };
}
