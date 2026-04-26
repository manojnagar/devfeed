/**
 * @file Shared loader for the public feed pages.
 *
 * Parses the request's search params with `FilterQuerySchema`, fetches
 * the matching paginated post list, and resolves the ancillary data
 * the FilterSidebar needs (publisher list + featured tags). Used by
 * the home page, publisher detail, tag detail, and search routes.
 */

import { getRepository } from "@/lib/data";
import { FilterQuerySchema } from "@/lib/schemas";
import type { Page, PostWithRelations, Publisher, Tag } from "@/lib/types";
import type { ListPostsOptions } from "@/lib/data/types";

export interface FeedLoadInput {
  searchParams: Record<string, string | string[] | undefined>;
  overrideOptions?: Partial<ListPostsOptions>;
  pageSize?: number;
}

export interface FeedLoadResult {
  page: Page<PostWithRelations>;
  publishers: Publisher[];
  featuredTags: Tag[];
  selected: {
    type: string[];
    publisher: string[];
    tag: string[];
    access: string[];
    from: string | null;
    q: string;
  };
}

function flatten(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value.join(",") : value;
}

/** Load everything the public feed pages need in one round trip. */
export async function loadFeed(input: FeedLoadInput): Promise<FeedLoadResult> {
  const repo = getRepository();
  const flat = {
    type: flatten(input.searchParams.type),
    publisher: flatten(input.searchParams.publisher),
    tag: flatten(input.searchParams.tag),
    access: flatten(input.searchParams.access),
    q: flatten(input.searchParams.q),
    from: flatten(input.searchParams.from),
    sort: flatten(input.searchParams.sort) || undefined,
    page: flatten(input.searchParams.page) || undefined,
  };
  const parsed = FilterQuerySchema.parse(flat);
  const options: ListPostsOptions = {
    ...parsed,
    pageSize: input.pageSize ?? 12,
    ...input.overrideOptions,
  };
  const [page, publishers, featuredTags] = await Promise.all([
    repo.posts.list(options),
    repo.publishers.list({ isActive: true }),
    repo.tags.list({ featuredOnly: true }),
  ]);
  return {
    page,
    publishers,
    featuredTags,
    selected: {
      type: parsed.type ?? [],
      publisher: parsed.publisher ?? [],
      tag: parsed.tag ?? [],
      access: parsed.access ?? [],
      from: parsed.from ? parsed.from.toISOString() : null,
      q: parsed.q ?? "",
    },
  };
}
