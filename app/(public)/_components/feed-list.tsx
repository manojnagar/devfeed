/**
 * @file Feed list — renders a paginated list of PostCards.
 *
 * Empty state and pagination footer are handled here so every public
 * page that wants a feed can drop this in.
 *
 * Layout:
 * - Default `columns=1` keeps the original single-column rhythm —
 *   used by /search, /tags/[slug], /publishers/[slug] where the
 *   reader is already filtering down to a narrow context.
 * - `columns=2` switches to a responsive 1→2 column grid at the `lg`
 *   breakpoint (≥1024px). We don't go wider than 2 because PostCards
 *   need ~340px to keep the title + summary readable next to the
 *   author meta. At narrower viewports (<lg) the layout collapses to
 *   a single column so cards never get squashed.
 */

import Link from "next/link";
import { PostCard } from "@/components/post/post-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import type { Page, PostWithRelations } from "@/lib/types";
import { visiblePageNumbers, type PaginationLinks } from "../_lib/pagination";

export interface FeedListProps {
  page: Page<PostWithRelations>;
  pagination: PaginationLinks;
  emptyMessage?: string;
  /**
   * Number of columns in the feed grid.
   * - `1` (default): original vertical stack, used by detail pages.
   * - `2`: responsive 2-column grid at `lg+`, used by the home feed
   *   so more posts are visible without scrolling.
   */
  columns?: 1 | 2;
}

export function FeedList({
  page,
  pagination,
  emptyMessage,
  columns = 1,
}: FeedListProps) {
  if (page.items.length === 0) {
    return (
      <EmptyState
        title="No posts match your filters"
        description={emptyMessage ?? "Try removing a filter or expanding the time range."}
      />
    );
  }
  // `auto-rows-fr` is what equalizes card heights inside a row in the
  // 2-column grid: combined with `h-full flex flex-col` on the card
  // and `flex-1` on the body, every card in a row stretches to match
  // the tallest sibling so footers always line up.
  const gridClass = cn(
    "gap-3",
    columns === 2 ? "grid grid-cols-1 auto-rows-fr lg:grid-cols-2" : "flex flex-col",
  );
  return (
    <div className="space-y-4">
      <div className={gridClass}>
        {page.items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {pagination.totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm"
          aria-label="Pagination"
        >
          <div className="min-w-0">
            {pagination.prev ? (
              <Link href={pagination.prev} className={navButtonClass}>
                ← Newer
              </Link>
            ) : (
              <span className={cn(navButtonClass, "cursor-not-allowed opacity-40")} aria-disabled>
                ← Newer
              </span>
            )}
          </div>
          {/* Jump-to-page list. Shows up to 7 entries with `…` gaps so
              users can land on page 1 / N or anything within ±1 of the
              current page in a single click. */}
          <ol className="flex flex-wrap items-center justify-center gap-1">
            {visiblePageNumbers(pagination.currentPage, pagination.totalPages).map((entry, idx) =>
              entry === "…" ? (
                <li
                  key={`gap-${idx}`}
                  aria-hidden="true"
                  className="px-2 text-[rgb(var(--color-fg-muted))]"
                >
                  …
                </li>
              ) : entry === pagination.currentPage ? (
                <li key={entry}>
                  <span
                    aria-current="page"
                    className={cn(
                      pageButtonClass,
                      "border-[rgb(var(--color-accent))] bg-[rgb(var(--color-accent))]/10 font-semibold text-[rgb(var(--color-accent))]",
                    )}
                  >
                    {entry}
                  </span>
                </li>
              ) : (
                <li key={entry}>
                  <Link
                    href={pagination.pageHref(entry)}
                    aria-label={`Go to page ${entry}`}
                    className={pageButtonClass}
                  >
                    {entry}
                  </Link>
                </li>
              ),
            )}
          </ol>
          <div className="min-w-0">
            {pagination.next ? (
              <Link href={pagination.next} className={navButtonClass}>
                Older →
              </Link>
            ) : (
              <span className={cn(navButtonClass, "cursor-not-allowed opacity-40")} aria-disabled>
                Older →
              </span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

/** Pill-style button used for Newer/Older. */
const navButtonClass =
  "rounded-md border border-[rgb(var(--color-line-strong))] px-3 py-1.5 hover:bg-[rgb(var(--color-surface))]";

/** Square-ish button used for individual page numbers. */
const pageButtonClass =
  "inline-flex min-w-9 items-center justify-center rounded-md border border-[rgb(var(--color-line-strong))] px-2 py-1.5 text-center hover:bg-[rgb(var(--color-surface))]";
