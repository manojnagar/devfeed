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
import type { PaginationLinks } from "../_lib/pagination";

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
  const gridClass = cn(
    "gap-3",
    columns === 2 ? "grid grid-cols-1 lg:grid-cols-2" : "flex flex-col",
  );
  return (
    <div className="space-y-4">
      <div className={gridClass}>
        {page.items.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {(pagination.prev || pagination.next) && (
        <nav className="flex items-center justify-between pt-4 text-sm" aria-label="Pagination">
          <div>
            {pagination.prev ? (
              <Link
                href={pagination.prev}
                className="px-3 py-1.5 rounded-md border border-[rgb(var(--color-line-strong))] hover:bg-[rgb(var(--color-surface))]"
              >
                ← Newer
              </Link>
            ) : null}
          </div>
          <p className="text-[rgb(var(--color-fg-muted))]">
            Page {page.page} of {pagination.totalPages}
          </p>
          <div>
            {pagination.next ? (
              <Link
                href={pagination.next}
                className="px-3 py-1.5 rounded-md border border-[rgb(var(--color-line-strong))] hover:bg-[rgb(var(--color-surface))]"
              >
                Older →
              </Link>
            ) : null}
          </div>
        </nav>
      )}
    </div>
  );
}
