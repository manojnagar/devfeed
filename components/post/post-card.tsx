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
import { resolvePublisherLogoCandidates } from "@/lib/publisher-logo";

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
  const hasAccessBadge = post.accessLabel !== "free";
  const tagsToShow = post.tags.slice(0, 3);
  const showFooterLeftBaseline = !hasAccessBadge && tagsToShow.length === 0;
  return (
    <Card className="relative flex h-full flex-col overflow-hidden transition-colors hover:border-[rgb(var(--color-line-strong))] focus-within:border-[rgb(var(--color-accent))]">
      {/* Stretched link — covers the whole card. Inner interactive elements
          opt in to a higher stacking context with `relative z-10`. */}
      <Link
        href={`/posts/${post.id}`}
        aria-label={`Preview: ${post.title}`}
        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-accent))]"
      >
        <span className="sr-only">Open preview</span>
      </Link>

      <CardBody className={cn("flex-1", variant === "compact" && "py-3 px-4")}>
        <div className="flex items-start gap-3">
          <Avatar
            name={post.publisher.name}
            src={resolvePublisherLogoCandidates(post.publisher)}
            size={40}
          />
          <div className="min-w-0 flex-1">
            {/* Meta row: kept on a single line. Publisher name truncates;
                separators, pills, and dates never wrap so we never get
                `3 days ago` split across two lines on narrow cards. */}
            <div className="relative z-10 mb-1 flex items-center gap-2 text-xs text-[rgb(var(--color-fg-muted))]">
              <Link
                href={`/publishers/${post.publisher.slug}`}
                className="min-w-0 truncate font-medium text-[rgb(var(--color-fg))] hover:text-[rgb(var(--color-accent))]"
              >
                {post.publisher.name}
              </Link>
              <span className="shrink-0" aria-hidden>·</span>
              <Pill
                tone={post.publisher.type === "person" ? "type-person" : "type-company"}
                size="sm"
                className="shrink-0"
              >
                {post.publisher.type === "person" ? "Person" : "Company"}
              </Pill>
              <span className="shrink-0" aria-hidden>·</span>
              <time
                className="shrink-0 whitespace-nowrap"
                dateTime={post.publishedAt}
                title={absoluteDate(post.publishedAt)}
              >
                {relativeTime(post.publishedAt)}
              </time>
              {reading ? (
                <>
                  <span className="shrink-0" aria-hidden>·</span>
                  <span className="shrink-0 whitespace-nowrap">{reading}</span>
                </>
              ) : null}
            </div>
            {/* Title: clamped to 2 lines so cards don't tower over their
                neighbours. Full title is still exposed via the stretched
                link's aria-label for assistive tech. */}
            <h2
              className={cn(
                "font-semibold leading-snug text-[rgb(var(--color-fg))] line-clamp-2 group-hover:text-[rgb(var(--color-accent))]",
                variant === "compact" ? "text-base" : "text-lg",
              )}
            >
              {post.title}
            </h2>
            {variant !== "compact" ? (
              // Summary: clamped to 3 lines AND reserves vertical space
              // even when the post has none, so cards with missing
              // summaries don't collapse into an awkward grey gap.
              // 3 lines × 1.25rem (text-sm leading-5) = 3.75rem.
              <p
                className={cn(
                  "mt-1.5 line-clamp-3 min-h-15 text-sm text-[rgb(var(--color-fg-muted))]",
                  !post.summary && "italic",
                )}
              >
                {post.summary ?? "No preview available."}
              </p>
            ) : null}
          </div>
        </div>
      </CardBody>
      <CardFooter className="relative z-10 flex items-center justify-between gap-3">
        <div
          className={cn(
            "flex flex-wrap items-center gap-1.5",
            // Reserve the height of one Pill (h-6 = 1.5rem) so cards
            // with no access badge AND no tags still match the height
            // of their tagged siblings instead of becoming a thin strip.
            showFooterLeftBaseline && "min-h-6",
          )}
        >
          <AccessBadge access={post.accessLabel} />
          {tagsToShow.map((t) => (
            <Link key={t.id} href={`/tags/${t.slug}`}>
              <Pill tone="neutral" size="sm">
                #{t.slug}
              </Pill>
            </Link>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
