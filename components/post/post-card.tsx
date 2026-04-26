/**
 * @file PostCard — the primary feed card.
 *
 * Renders a single post in the public feed, bookmarks list, and
 * publisher / tag detail pages. Behaviour:
 *
 * - The whole card is one clickable surface (stretched link) that
 *   navigates to the in-app preview at `/posts/[postId]`. The preview
 *   page is what hosts the explicit "Open original" outbound CTA.
 * - Inner links (publisher name, tag pills) and the bookmark button
 *   sit on a higher z-index so they remain interactive.
 *
 * Bookmark button is rendered only when an explicit `bookmarkAction` is
 * passed (account pages bind it to a Server Action); on the anonymous
 * public feed it shows a disabled icon as a hint.
 */

import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Card, CardBody, CardFooter, Pill, Avatar } from "@/components/ui";
import { AccessBadge } from "./access-badge";
import { absoluteDate, readingTimeLabel, relativeTime } from "@/lib/dates";
import type { PostWithRelations } from "@/lib/types";
import { cn } from "@/lib/cn";

export interface PostCardProps {
  post: PostWithRelations;
  variant?: "default" | "compact";
  isBookmarked?: boolean;
  bookmarkAction?: React.ReactNode;
}

export function PostCard({
  post,
  variant = "default",
  isBookmarked = false,
  bookmarkAction,
}: PostCardProps) {
  const reading = readingTimeLabel(post.readingTimeMin);
  return (
    <Card className="relative overflow-hidden transition-colors hover:border-[rgb(var(--color-line-strong))] focus-within:border-[rgb(var(--color-accent))]">
      {/* Stretched link — covers the whole card. Inner interactive elements
          opt in to a higher stacking context with `relative z-10`. */}
      <Link
        href={`/posts/${post.id}`}
        aria-label={`Preview: ${post.title}`}
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-accent))]"
      >
        <span className="sr-only">Open preview</span>
      </Link>

      <CardBody className={cn(variant === "compact" && "py-3 px-4")}>
        <div className="flex items-start gap-3">
          <Avatar name={post.publisher.name} src={post.publisher.logoUrl} size={40} />
          <div className="min-w-0 flex-1">
            <div className="relative z-10 flex items-center gap-2 text-xs text-[rgb(var(--color-fg-muted))] mb-1">
              <Link
                href={`/publishers/${post.publisher.slug}`}
                className="font-medium text-[rgb(var(--color-fg))] hover:text-[rgb(var(--color-accent))]"
              >
                {post.publisher.name}
              </Link>
              <span aria-hidden>·</span>
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
            </div>
            <h2
              className={cn(
                "font-semibold leading-snug text-[rgb(var(--color-fg))] group-hover:text-[rgb(var(--color-accent))]",
                variant === "compact" ? "text-base" : "text-lg",
              )}
            >
              {post.title}
            </h2>
            {variant !== "compact" && post.summary ? (
              <p className="mt-1.5 text-sm text-[rgb(var(--color-fg-muted))] line-clamp-3">
                {post.summary}
              </p>
            ) : null}
          </div>
        </div>
      </CardBody>
      <CardFooter className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <AccessBadge access={post.accessLabel} />
          {post.tags.slice(0, 3).map((t) => (
            <Link key={t.id} href={`/tags/${t.slug}`}>
              <Pill tone="neutral" size="sm">
                #{t.slug}
              </Pill>
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {bookmarkAction ?? (
            <button
              type="button"
              aria-label={isBookmarked ? "Bookmarked" : "Bookmark for later"}
              className="text-[rgb(var(--color-fg-muted))] hover:text-[rgb(var(--color-accent))] disabled:opacity-50"
              disabled
              title="Sign in to bookmark"
            >
              {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
