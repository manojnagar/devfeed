/**
 * @file Tests for the public-feed pagination URL builder + page-window helper.
 */

import { describe, it, expect } from "vitest";
import { buildPagination, visiblePageNumbers } from "@/app/(public)/_lib/pagination";

describe("buildPagination", () => {
  it("returns prev/next/href reflecting the current page", () => {
    const p = buildPagination({
      basePath: "/",
      searchParams: { tag: "go", q: "tail" },
      page: 3,
      pageSize: 10,
      total: 47,
    });
    expect(p.totalPages).toBe(5);
    expect(p.currentPage).toBe(3);
    expect(p.prev).toBe("/?tag=go&q=tail&page=2");
    expect(p.next).toBe("/?tag=go&q=tail&page=4");
  });

  it("drops `page` from the URL when navigating to page 1", () => {
    const p = buildPagination({
      basePath: "/",
      searchParams: { tag: "go", page: "2" },
      page: 2,
      pageSize: 10,
      total: 50,
    });
    expect(p.pageHref(1)).toBe("/?tag=go");
  });

  it("clamps the current page into [1, totalPages]", () => {
    const p = buildPagination({
      basePath: "/",
      searchParams: {},
      page: 99,
      pageSize: 10,
      total: 23,
    });
    expect(p.totalPages).toBe(3);
    expect(p.currentPage).toBe(3);
    expect(p.next).toBe(null);
  });

  it("returns null prev/next at the boundaries", () => {
    const single = buildPagination({
      basePath: "/",
      searchParams: {},
      page: 1,
      pageSize: 10,
      total: 4,
    });
    expect(single.prev).toBe(null);
    expect(single.next).toBe(null);
    expect(single.totalPages).toBe(1);
  });
});

describe("visiblePageNumbers (windowSize=5 default)", () => {
  it("returns every page when total fits inside the window plus bookends", () => {
    expect(visiblePageNumbers(1, 1)).toEqual([1]);
    expect(visiblePageNumbers(2, 3)).toEqual([1, 2, 3]);
    expect(visiblePageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("slides the window towards the start so 5 numbers stay visible on page 1", () => {
    expect(visiblePageNumbers(1, 34)).toEqual([1, 2, 3, 4, 5, "…", 34]);
    expect(visiblePageNumbers(2, 34)).toEqual([1, 2, 3, 4, 5, "…", 34]);
  });

  it("slides the window towards the end on the last page", () => {
    expect(visiblePageNumbers(34, 34)).toEqual([1, "…", 30, 31, 32, 33, 34]);
    expect(visiblePageNumbers(33, 34)).toEqual([1, "…", 30, 31, 32, 33, 34]);
  });

  it("centers the window with ellipses on both sides when current is in the middle", () => {
    expect(visiblePageNumbers(6, 34)).toEqual([1, "…", 4, 5, 6, 7, 8, "…", 34]);
  });

  it("drops the left ellipsis when its single page would only hide page 2", () => {
    expect(visiblePageNumbers(4, 34)).toEqual([1, 2, 3, 4, 5, 6, "…", 34]);
  });

  it("respects a custom windowSize", () => {
    expect(visiblePageNumbers(1, 34, 3)).toEqual([1, 2, 3, "…", 34]);
    expect(visiblePageNumbers(6, 34, 3)).toEqual([1, "…", 5, 6, 7, "…", 34]);
  });
});
