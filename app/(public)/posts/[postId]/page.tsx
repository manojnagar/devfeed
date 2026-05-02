/**
 * @file Post detail page — full inline reader.
 *
 * Renders the post header (publisher, title, tags, time, reading time)
 * synchronously and the article body inside a Suspense boundary so the
 * page header is interactive before the body resolves. The body comes
 * from one of three places, in priority order:
 *
 *   1. `post.bodyHtml` populated by ingest from `<content:encoded>`
 *      (`body_source === "feed"`). Cheapest, already sanitized.
 *   2. `post.bodyHtml` populated by a previous on-demand extraction.
 *   3. Fresh on-demand extraction via Mozilla Readability + safeFetch,
 *      cached back onto the row so the next visitor is instant.
 *
 * If extraction fails (paywall, JS-only page, robots block) we cache
 * the failure for ~24h and fall back to the original summary + the
 * shared `OpenOriginalCTA` button.
 *
 * There is exactly ONE outbound CTA on the page (`OpenOriginalCTA`),
 * rendered once at the bottom of the article. We deliberately avoid
 * duplicating it (e.g. fallback panel + footer line) because two CTAs
 * with `target="_blank"` pointing at the same route are an easy way
 * for users to accidentally open multiple tabs. The link still routes
 * through `/out/[postId]` so read events keep firing.
 */

import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Avatar, Pill } from "@/components/ui";
import { AccessBadge } from "@/components/post/access-badge";
import { getRepository } from "@/lib/data";
import { absoluteDate, readingTimeLabel, relativeTime } from "@/lib/dates";
import { extractArticle } from "@/lib/ingest/extract-article";
import { sanitizePostBody } from "@/lib/ingest/sanitize-body";
import { consumeSlidingLimit } from "@/lib/rate-limit";
import { getAnonIdReadOnly } from "@/lib/anon-id";
import { log } from "@/lib/log";
import { nowIso } from "@/lib/dates";
import type { PostWithRelations } from "@/lib/types";

interface Props {
  params: Promise<{ postId: string }>;
}

export const dynamic = "force-dynamic";

const FAILURE_COOLOFF_MS = 24 * 60 * 60 * 1000;
const EXTRACT_RATE_WINDOW_MS = 60 * 60 * 1000;
const EXTRACT_RATE_MAX = 60;

export async function generateMetadata({ params }: Props) {
  const { postId } = await params;
  const post = await getRepository().posts.getById(postId);
  if (!post) return { title: "Post not found" };
  return {
    title: `${post.title} · ${post.publisher.name}`,
    description: post.summary ?? undefined,
  };
}

export default async function PostPreview({ params }: Props) {
  const { postId } = await params;
  const post = await getRepository().posts.getById(postId);
  if (!post) notFound();

  const reading = readingTimeLabel(post.readingTimeMin);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-accent))]"
      >
        <ArrowLeft size={14} aria-hidden /> Back to feed
      </Link>

      <article className="mt-6">
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={post.publisher.name} src={post.publisher.logoUrl} size={48} />
            <div className="min-w-0">
              <Link
                href={`/publishers/${post.publisher.slug}`}
                className="font-medium text-[rgb(var(--color-fg))] hover:text-[rgb(var(--color-accent))]"
              >
                {post.publisher.name}
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--color-fg-muted))] mt-0.5">
                <Pill
                  tone={post.publisher.type === "person" ? "type-person" : "type-company"}
                  size="sm"
                >
                  {post.publisher.type === "person" ? "Person" : "Company"}
                </Pill>
                <span aria-hidden>·</span>
                <time dateTime={post.publishedAt} title={absoluteDate(post.publishedAt)}>
                  {relativeTime(post.publishedAt)}
                </time>
                {reading ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{reading}</span>
                  </>
                ) : null}
                {post.authorName ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>by {post.authorName}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-semibold leading-tight text-[rgb(var(--color-fg))]">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <AccessBadge access={post.accessLabel} />
            {post.tags.map((t) => (
              <Link key={t.id} href={`/tags/${t.slug}`}>
                <Pill tone="neutral" size="sm">
                  #{t.slug}
                </Pill>
              </Link>
            ))}
          </div>
        </header>

        <Suspense fallback={<BodySkeleton />}>
          <PostBody post={post} />
        </Suspense>

        <div className="mt-10 border-t border-[rgb(var(--color-line))] pt-6">
          <p className="mb-3 text-xs text-[rgb(var(--color-fg-muted))]">
            Originally published on {post.publisher.name}.
          </p>
          <OpenOriginalCTA post={post} />
        </div>
      </article>
    </div>
  );
}

/**
 * The single outbound CTA used on the post page. Rendered once at the
 * bottom of the article and re-used by the fallback panel so we never
 * ship two `target="_blank"` links pointing at the same route.
 */
function OpenOriginalCTA({ post }: { post: PostWithRelations }) {
  return (
    <a
      href={`/out/${post.id}`}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="open-original-cta"
      className="inline-flex items-center justify-center gap-2 rounded-md bg-[rgb(var(--color-accent))] px-5 py-3 text-sm font-semibold text-[rgb(var(--color-on-accent))] shadow-sm transition-colors hover:bg-[rgb(var(--color-accent-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent))] focus-visible:ring-offset-2"
    >
      Read full article on {post.publisher.name}
      <ExternalLink size={16} aria-hidden />
    </a>
  );
}

function BodySkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading article"
      className="space-y-3 animate-pulse"
    >
      {[80, 65, 90, 70, 85, 60].map((w, i) => (
        <div
          key={i}
          className="h-3 rounded bg-[rgb(var(--color-surface))]"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Server component that resolves the post body. Streams in via
 * Suspense, so the page shell paints first and the body materializes
 * once `extractArticle` (or the cached lookup) finishes.
 */
async function PostBody({ post }: { post: PostWithRelations }) {
  const repo = getRepository();
  const fresh = await repo.posts.getById(post.id);
  const candidate = fresh ?? post;

  // Fast path: anything cached on the row.
  if (candidate.bodyHtml) {
    return renderBody(candidate.bodyHtml, candidate.bodySource ?? "feed", candidate);
  }

  // Cool-off: don't retry a known-bad URL for 24h.
  if (candidate.bodyFailedAt) {
    const failedAt = new Date(candidate.bodyFailedAt).getTime();
    if (Number.isFinite(failedAt) && Date.now() - failedAt < FAILURE_COOLOFF_MS) {
      return <BodyFallback post={candidate} reason={candidate.bodyFailedReason} />;
    }
  }

  // Per-visitor rate limit so a bot can't turn the page into a proxy.
  // Server Components can't *set* cookies, so we read the anon id if
  // it already exists; otherwise we bucket by forwarded-for IP. Either
  // signal alone is good enough — the worst case is one bucket per
  // unique anon visitor, which is still well above the 60/hour cap.
  const [anonId, hdrs] = await Promise.all([getAnonIdReadOnly(), headers()]);
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const bucket = anonId ?? ip ?? "anon";
  const limit = consumeSlidingLimit({
    key: `post_body_extract:${bucket}`,
    windowMs: EXTRACT_RATE_WINDOW_MS,
    max: EXTRACT_RATE_MAX,
  });
  if (!limit.allowed) {
    log.warn("post_body_extract_rate_limited", { postId: candidate.id, bucket });
    return <BodyFallback post={candidate} reason="rate_limited" />;
  }

  const extracted = await extractArticle(candidate.url);
  if (!extracted.ok) {
    await repo.posts.setBodyFailed(candidate.id, {
      reason: extracted.reason,
      failedAt: nowIso(),
    });
    log.info("post_body_extract_failed", {
      postId: candidate.id,
      reason: extracted.reason,
    });
    return <BodyFallback post={candidate} reason={extracted.reason} />;
  }

  // Already sanitized inside extractArticle, but run it through the
  // sanitizer one more time at render — defense in depth makes the
  // contract "we never render unsanitized HTML" easier to audit.
  const safe = sanitizePostBody(extracted.bodyHtml);
  await repo.posts.setBody(candidate.id, {
    bodyHtml: safe,
    bodySource: "extracted",
    bodyExtractedAt: nowIso(),
  });
  log.info("post_body_extracted", {
    postId: candidate.id,
    bytes: safe.length,
  });
  return renderBody(safe, "extracted", candidate);
}

function renderBody(
  bodyHtml: string,
  source: "feed" | "extracted",
  post: PostWithRelations,
) {
  // Final sanitization at render time — even cached DB content goes
  // through the allow-list so a tampered row still can't inject script.
  const safe = sanitizePostBody(bodyHtml);
  return (
    <>
      {source === "extracted" ? (
        <p className="mb-4 text-xs text-[rgb(var(--color-fg-muted))] italic">
          Reader-mode preview generated from {post.publisher.name}.
        </p>
      ) : null}
      <div
        className="article-body"
        // eslint-disable-next-line react/no-danger -- input goes through sanitizePostBody twice
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </>
  );
}

function BodyFallback({
  post,
  reason,
}: {
  post: PostWithRelations;
  reason: string | null;
}) {
  // No CTA inside the panel — the page renders the single
  // `OpenOriginalCTA` below the body. Avoids the multi-tab footgun
  // where two `target="_blank"` links to the same route trick users
  // into opening duplicate tabs after a flaky upstream.
  return (
    <div className="rounded-md border border-[rgb(var(--color-line))] bg-[rgb(var(--color-surface))] p-4 text-sm text-[rgb(var(--color-fg-muted))]">
      <p>
        We couldn&apos;t generate an inline preview for this article
        {reason ? <> ({reason})</> : null}.
      </p>
      {post.summary ? (
        <p className="mt-3 text-[rgb(var(--color-fg))]">{post.summary}</p>
      ) : null}
    </div>
  );
}
