/**
 * @file Daily / weekly digest email template.
 *
 * Pure function — given a list of posts and a recipient context,
 * returns `{ subject, html, text }`. Kept as a string-template so
 * tests can snapshot the output without spinning up React.
 *
 * The HTML uses inline styles only (no <style> tag) for maximum email
 * client compatibility.
 */

import type { PostWithRelations } from "../../types";
import type { RenderedEmail } from "../types";
import { absoluteDate, readingTimeLabel } from "../../dates";

export interface DigestEmailContext {
  recipientEmail: string;
  recipientName: string | null;
  frequency: "daily" | "weekly";
  posts: PostWithRelations[];
  unsubscribeUrl: string;
  siteUrl: string;
}

const COLORS = {
  bg: "#ffffff",
  text: "#111113",
  muted: "#555560",
  line: "#e2e2e6",
  accent: "#2364eb",
};

function postCardHtml(post: PostWithRelations, siteUrl: string): string {
  const tags = post.tags
    .slice(0, 3)
    .map((t) => `<span style="font-size:12px;color:${COLORS.muted};margin-right:8px">#${t.slug}</span>`)
    .join("");
  const reading = readingTimeLabel(post.readingTimeMin);
  const access = post.accessLabel === "free" ? "" : `<span style="font-size:11px;color:#a86e00;border:1px solid #a86e00;border-radius:4px;padding:1px 6px;margin-right:8px">${post.accessLabel.toUpperCase()}</span>`;
  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid ${COLORS.line}">
        <div style="font-size:13px;color:${COLORS.muted};margin-bottom:6px">
          ${post.publisher.name} · ${absoluteDate(post.publishedAt)}${reading ? " · " + reading : ""}
        </div>
        <a href="${siteUrl}/out/${post.id}" style="color:${COLORS.text};text-decoration:none;font-weight:600;font-size:17px;line-height:1.3">
          ${escapeHtml(post.title)}
        </a>
        ${post.summary ? `<p style="font-size:14px;color:${COLORS.muted};margin:6px 0 8px;line-height:1.5">${escapeHtml(post.summary)}</p>` : ""}
        <div>${access}${tags}</div>
      </td>
    </tr>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function postLineText(post: PostWithRelations, siteUrl: string): string {
  return `- ${post.title}\n  ${post.publisher.name} — ${siteUrl}/out/${post.id}`;
}

/** Build subject + html + text bodies for a digest email. */
export function renderDigestEmail(ctx: DigestEmailContext): RenderedEmail {
  const greeting = ctx.recipientName ? `Hi ${ctx.recipientName},` : "Hi,";
  const subject =
    ctx.posts.length === 0
      ? `Your DevFeed ${ctx.frequency} digest`
      : `${ctx.posts.length} new posts in your DevFeed ${ctx.frequency} digest`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:${COLORS.text}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px 24px">
    <tr><td>
      <div style="font-size:13px;color:${COLORS.muted};letter-spacing:0.05em;text-transform:uppercase">DevFeed · ${ctx.frequency} digest</div>
      <h1 style="font-size:22px;margin:8px 0 16px;font-weight:600">${greeting}</h1>
      <p style="font-size:14px;color:${COLORS.muted};margin:0 0 24px">Here are the latest engineering posts we picked for you.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${ctx.posts.map((p) => postCardHtml(p, ctx.siteUrl)).join("")}
      </table>
      <div style="margin-top:24px;font-size:12px;color:${COLORS.muted}">
        <a href="${ctx.siteUrl}/me/digest" style="color:${COLORS.accent}">Adjust your digest preferences</a> ·
        <a href="${ctx.unsubscribeUrl}" style="color:${COLORS.muted}">Unsubscribe</a>
      </div>
    </td></tr>
  </table>
</body></html>`;

  const text = `${greeting}\n\nYour DevFeed ${ctx.frequency} digest:\n\n${ctx.posts
    .map((p) => postLineText(p, ctx.siteUrl))
    .join(
      "\n\n",
    )}\n\nManage preferences: ${ctx.siteUrl}/me/digest\nUnsubscribe: ${ctx.unsubscribeUrl}\n`;

  return { subject, html, text };
}
