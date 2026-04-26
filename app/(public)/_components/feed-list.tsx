/**
 * @file Feed list — renders a paginated list of PostCards.
 *
 * Empty state and pagination footer are handled here so every public
 * page that wants a feed can drop this in.
 */

import Link from "next/link";
import { PostCard } from "@/components/post/post-card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Page, PostWithRelations } from "@/lib/types";
import type { PaginationLinks } from "../_lib/pagination";

export interface FeedListProps {
  page: Page<PostWithRelations>;
  pagination: PaginationLinks;
  emptyMessage?: string;
}

export function FeedList({ page, pagination, emptyMessage }: FeedListProps) {
  if (page.items.length === 0) {
    return (
      <EmptyState
        title="No posts match your filters"
        description={emptyMessage ?? "Try removing a filter or expanding the time range."}
      />
    );
  }
  return (
    <div className="space-y-3">
      {page.items.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
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
