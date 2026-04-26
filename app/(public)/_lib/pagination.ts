/**
 * @file URL builders for paginated routes.
 *
 * Returns "previous"/"next" hrefs preserving the existing search
 * params so the user keeps their filters when paging through results.
 */

export interface PaginationOptions {
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginationLinks {
  prev: string | null;
  next: string | null;
  totalPages: number;
}

function flatten(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value.join(",") : value;
}

function buildHref(basePath: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Compute prev/next URLs for a paginated list page. */
export function buildPagination(opts: PaginationOptions): PaginationLinks {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.searchParams)) {
    const flat = flatten(v);
    if (flat && k !== "page") params.set(k, flat);
  }
  const totalPages = Math.max(1, Math.ceil(opts.total / opts.pageSize));
  return {
    prev: opts.page > 1 ? buildHref(opts.basePath, params, opts.page - 1) : null,
    next: opts.page < totalPages ? buildHref(opts.basePath, params, opts.page + 1) : null,
    totalPages,
  };
}
