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
  /** Current 1-indexed page (clamped to [1, totalPages]). */
  currentPage: number;
  /**
   * Build the URL for any 1-indexed page in the same context (preserves
   * filters and search query). Used by the feed footer to render
   * jump-to-page links.
   */
  pageHref: (page: number) => string;
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

/** Compute prev/next URLs and the page-href builder for a paginated list page. */
export function buildPagination(opts: PaginationOptions): PaginationLinks {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.searchParams)) {
    const flat = flatten(v);
    if (flat && k !== "page") params.set(k, flat);
  }
  const totalPages = Math.max(1, Math.ceil(opts.total / opts.pageSize));
  const currentPage = Math.min(Math.max(1, opts.page), totalPages);
  const pageHref = (page: number): string =>
    buildHref(opts.basePath, params, Math.min(Math.max(1, page), totalPages));
  return {
    prev: currentPage > 1 ? pageHref(currentPage - 1) : null,
    next: currentPage < totalPages ? pageHref(currentPage + 1) : null,
    totalPages,
    currentPage,
    pageHref,
  };
}

/**
 * Return the page numbers a footer should render given the current
 * page and totalPages. Always shows up to `windowSize` *contiguous*
 * page numbers; when the contiguous window doesn't reach the first
 * or last page we render that page as a bookend with a `"…"` gap.
 *
 * The window slides at the boundaries so we never under-render — when
 * `current` is near 1 or `totalPages`, the window shifts so it still
 * contains exactly `windowSize` numbers (assuming `totalPages` is big
 * enough). Below the threshold every page is shown without ellipses.
 *
 * Examples (current/total with default windowSize=5 → output):
 *   - 1/3   → [1, 2, 3]
 *   - 1/34  → [1, 2, 3, 4, 5, "…", 34]
 *   - 6/34  → [1, "…", 4, 5, 6, 7, 8, "…", 34]
 *   - 34/34 → [1, "…", 30, 31, 32, 33, 34]
 */
export function visiblePageNumbers(
  current: number,
  totalPages: number,
  windowSize = 5,
): Array<number | "…"> {
  if (totalPages <= 1) return [1];
  // No ellipses when every page already fits in `windowSize` plus the
  // two bookend slots — render the full range instead.
  if (totalPages <= windowSize + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(windowSize / 2);
  let start = current - half;
  let end = current + half;

  // Slide the window inwards if it overshoots either edge so it always
  // contains exactly `windowSize` contiguous pages (when possible).
  if (start < 1) {
    end += 1 - start;
    start = 1;
  }
  if (end > totalPages) {
    start -= end - totalPages;
    end = totalPages;
  }
  start = Math.max(1, start);
  end = Math.min(totalPages, end);

  const pages: Array<number | "…"> = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("…");
  }
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push("…");
    pages.push(totalPages);
  }
  return pages;
}
