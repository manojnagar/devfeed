/**
 * @file Post preview page.
 *
 * Renders the chosen post inside DevFeed (publisher, tags, summary,
 * reading time). The "Open original" CTA is the only outbound action;
 * it routes through `/out/[postId]` so we still record the read event.
 *
 * Why this page exists:
 *   - PostCard is now a "stretched link" pointing here, so clicking
 *     anywhere on a card reaches a deterministic in-app destination.
 *   - Users get a publisher-branded preview before being sent off-site,
 *     so a card that links to a synthetic seed URL doesn't look like
 *     a broken external redirect.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Avatar, Pill } from "@/components/ui";
import { AccessBadge } from "@/components/post/access-badge";
import { getRepository } from "@/lib/data";
import { absoluteDate, readingTimeLabel, relativeTime } from "@/lib/dates";

interface Props {
  params: Promise<{ postId: string }>;
}

export const dynamic = "force-dynamic";

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

        {post.summary ? (
          <p className="mt-4 text-base leading-relaxed text-[rgb(var(--color-fg-muted))]">
            {post.summary}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-1.5">
          <AccessBadge access={post.accessLabel} />
          {post.tags.map((t) => (
            <Link key={t.id} href={`/tags/${t.slug}`}>
              <Pill tone="neutral" size="sm">
                #{t.slug}
              </Pill>
            </Link>
          ))}
        </div>

        <div className="mt-8 border-t border-[rgb(var(--color-line))] pt-6">
          <p className="text-sm text-[rgb(var(--color-fg-muted))]">
            DevFeed shows a curated preview. To read the full post, continue to {post.publisher.name}.
          </p>
          <a
            href={`/out/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[rgb(var(--color-accent))] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Read on {post.publisher.name} <ExternalLink size={14} aria-hidden />
          </a>
        </div>
      </article>
    </div>
  );
}
