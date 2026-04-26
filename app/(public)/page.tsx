/**
 * @file Public home — the main feed.
 *
 * Server component. Reads filters from the URL via `searchParams`,
 * loads the paginated feed and ancillary data in one round trip, and
 * renders the FilterSidebar + FeedList side-by-side.
 */

import { FilterSidebar } from "@/components/filters/filter-sidebar";
import { loadFeed } from "./_lib/feed-loader";
import { buildPagination } from "./_lib/pagination";
import { FeedList } from "./_components/feed-list";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const sp = await searchParams;
  const { page, publishers, featuredTags, selected } = await loadFeed({ searchParams: sp });
  const pagination = buildPagination({
    basePath: "/",
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
          basePath="/"
        />
      </aside>
      <section>
        <header className="mb-4">
          <h1 className="text-2xl font-semibold mb-1">Latest engineering posts</h1>
          <p className="text-sm text-[rgb(var(--color-fg-muted))]">
            {page.total} posts {selected.q ? `matching "${selected.q}"` : "across the catalog"}
          </p>
        </header>
        <FeedList page={page} pagination={pagination} />
      </section>
    </div>
  );
}
