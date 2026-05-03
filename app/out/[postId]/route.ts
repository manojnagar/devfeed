/**
 * @file Read-tracking redirect: GET /out/[postId] → 302 → post.canonicalUrl.
 *
 * The "Read full article on …" button on /posts/[postId] points here so
 * we can record one read_event per click before bouncing the user to
 * the publisher's site. Failure to log MUST NOT break the redirect — we
 * always 302 even if the analytics insert throws.
 *
 * Privacy / logging-security:
 *   - IP and User-Agent are hashed with a daily-rotating salt
 *     (`UNSUBSCRIBE_SECRET` + UTC date) so we keep aggregate analytics
 *     without storing raw PII.
 *   - Referrer is truncated to its origin only.
 *   - The redirect target is validated to be `http`/`https`; everything
 *     else (including `javascript:` and `data:` URIs) is rejected with
 *     400 to close any open-redirect or injection vector.
 *
 * UX:
 *   - One read event per (post, user|anon) per 30 s — refreshing the
 *     redirect (or a paranoid client retrying) does not double-count.
 *   - The anon cookie is set on the response when missing so subsequent
 *     events on the same browser deduplicate naturally.
 */

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/data";
import { getOptionalSession } from "@/lib/auth";
import { ANON_COOKIE_NAME } from "@/lib/anon-id";
import { genId, hashWithDailySalt } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import { getEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { consumeSlidingLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ postId: string }>;
}

const ANON_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;
const READ_DEDUPE_WINDOW_MS = 30_000;

function dailySalt(): string {
  const env = getEnv();
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${env.UNSUBSCRIBE_SECRET}:${day}`)
    .digest("hex");
}

function isSafeRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function clientIp(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? "0.0.0.0";
}

function refOrigin(h: Headers): string | null {
  const ref = h.get("referer") ?? h.get("referrer");
  if (!ref) return null;
  try {
    return new URL(ref).origin;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { postId } = await ctx.params;

  const repo = getRepository();
  const post = await repo.posts.getById(postId);
  if (!post) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!isSafeRedirect(post.canonicalUrl)) {
    log.warn("out_unsafe_redirect", {
      postId,
      scheme: (() => {
        try {
          return new URL(post.canonicalUrl).protocol;
        } catch {
          return "invalid";
        }
      })(),
    });
    return new NextResponse("Invalid destination", { status: 400 });
  }

  const jar = await cookies();
  const existingAnon = jar.get(ANON_COOKIE_NAME)?.value;
  const anonId = existingAnon ?? genId();
  const session = await getOptionalSession();
  const userId = session?.user.userId ?? null;

  const h = await headers();
  const salt = dailySalt();
  const ipHash = hashWithDailySalt(clientIp(h), salt);
  const uaHash = hashWithDailySalt(h.get("user-agent") ?? "unknown", salt);
  const referrer = refOrigin(h);

  const bucketKey = `read:${postId}:${userId ?? anonId}`;
  const decision = consumeSlidingLimit({
    key: bucketKey,
    windowMs: READ_DEDUPE_WINDOW_MS,
    max: 1,
  });

  if (decision.allowed) {
    try {
      await repo.readEvents.insert({
        id: genId(),
        postId,
        userId,
        anonId,
        ipHash,
        uaHash,
        referrer,
        occurredAt: nowIso(),
      });
    } catch (err) {
      log.error("out_read_event_failed", {
        postId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const response = NextResponse.redirect(post.canonicalUrl, 302);
  if (!existingAnon) {
    response.cookies.set(ANON_COOKIE_NAME, anonId, {
      maxAge: ANON_COOKIE_MAX_AGE_SEC,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return response;
}
