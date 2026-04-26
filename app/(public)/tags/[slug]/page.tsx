/**
 * @file Tag detail — feed filtered by a single tag.
 */

import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { loadFeed } from "../../_lib/feed-loader";
import { buildPagination } from "../../_lib/pagination";
import { FeedList } from "../../_components/feed-list";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TagDetail({ params, searchParams }: Props) {
  const { slug } = await params;
  const tag = await getRepository().tags.getBySlug(slug);
  if (!tag) notFound();

  const sp = await searchParams;
  const merged = { ...sp, tag: slug };
  const { page } = await loadFeed({ searchParams: merged, pageSize: 15 });
  const pagination = buildPagination({
    basePath: `/tags/${slug}`,
    searchParams: sp,
    page: page.page,
    pageSize: page.pageSize,
    total: page.total,
  });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-[rgb(var(--color-fg-muted))]">Tag</p>
        <h1 className="text-2xl font-semibold">#{tag.slug}</h1>
        {tag.description ? (
          <p className="mt-1 text-sm text-[rgb(var(--color-fg-muted))]">{tag.description}</p>
        ) : null}
        <p className="mt-2 text-sm text-[rgb(var(--color-fg-muted))]">{page.total} posts tagged</p>
      </header>
      <FeedList page={page} pagination={pagination} emptyMessage="No posts with this tag yet." />
    </div>
  );
}
