/**
 * @file One-click unsubscribe — sets digest frequency to "off".
 *
 * Token is HMAC-signed (`createUnsubscribeToken`). On valid token we
 * mark the user as opted out and show a confirmation page; on bad
 * token we return 400 without exposing why (avoids guessing).
 */

import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/data";
import { verifyUnsubscribeToken } from "@/lib/digest/unsubscribe-token";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

const PAGE_OK = (email: string) => `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:80px auto;padding:0 16px">
  <h1 style="font-size:22px">You're unsubscribed</h1>
  <p style="color:#555">${escape(email)} will no longer receive DevFeed digests. You can re-enable them any time at <a href="/me/digest">/me/digest</a>.</p>
</body></html>`;

const PAGE_BAD = `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:80px auto;padding:0 16px">
  <h1 style="font-size:22px">Invalid unsubscribe link</h1>
  <p style="color:#555">This link is no longer valid. Sign in and adjust your preferences directly.</p>
</body></html>`;

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return new NextResponse(PAGE_BAD, { status: 400, headers: { "content-type": "text/html" } });
  }
  const repo = getRepository();
  const profile = await repo.profiles.getById(userId);
  if (!profile) {
    return new NextResponse(PAGE_BAD, { status: 400, headers: { "content-type": "text/html" } });
  }
  const prefs = await repo.digest.getPreferences(userId);
  await repo.digest.setPreferences({ ...prefs, frequency: "off" });
  log.info("digest_unsubscribed", { userId });
  return new NextResponse(PAGE_OK(profile.email), {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}
