/**
 * @file Publisher detail — header + filtered feed for that publisher.
 */

import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { PublisherHeader } from "@/components/publisher/publisher-header";
import { loadFeed } from "../../_lib/feed-loader";
import { buildPagination } from "../../_lib/pagination";
import { FeedList } from "../../_components/feed-list";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PublisherDetail({ params, searchParams }: Props) {
  const { slug } = await params;
  const repo = getRepository();
  const publisher = await repo.publishers.getBySlug(slug);
  if (!publisher) notFound();

  const sp = await searchParams;
  const merged = { ...sp, publisher: slug };
  const { page } = await loadFeed({ searchParams: merged, pageSize: 15 });
  const pagination = buildPagination({
    basePath: `/publishers/${slug}`,
    searchParams: sp,
    page: page.page,
    pageSize: page.pageSize,
    total: page.total,
  });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <PublisherHeader publisher={publisher} postCount={page.total} />
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Latest posts</h2>
        <FeedList page={page} pagination={pagination} emptyMessage="No posts yet from this publisher." />
      </section>
    </div>
  );
}
