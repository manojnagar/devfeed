/**
 * @file Search — keyword query across the post catalog.
 */

import { FilterSidebar } from "@/components/filters/filter-sidebar";
import { loadFeed } from "../_lib/feed-loader";
import { buildPagination } from "../_lib/pagination";
import { FeedList } from "../_components/feed-list";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { page, publishers, featuredTags, selected } = await loadFeed({ searchParams: sp });
  const pagination = buildPagination({
    basePath: "/search",
    searchParams: sp,
    page: page.page,
    pageSize: page.pageSize,
    total: page.total,
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-[260px_1fr] gap-8">
      <aside className="hidden md:block">
        <FilterSidebar
          publishers={publishers}
          featuredTags={featuredTags}
          selected={selected}
          basePath="/search"
        />
      </aside>
      <section>
        <header className="mb-4">
          <h1 className="text-2xl font-semibold mb-1">
            {selected.q ? `Search: "${selected.q}"` : "Search"}
          </h1>
          <p className="text-sm text-[rgb(var(--color-fg-muted))]">{page.total} results</p>
        </header>
        <FeedList page={page} pagination={pagination} emptyMessage="No posts match your query." />
      </section>
    </div>
  );
}
