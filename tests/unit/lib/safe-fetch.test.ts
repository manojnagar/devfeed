/**
 * @file Tests for the URL safety guards used by `safeFetch`.
 *
 * We don't make real network calls in unit tests — only the URL-shape
 * validation is exercised here.
 */

import { describe, it, expect } from "vitest";
import { safeFetch, UnsafeUrlError } from "@/lib/ingest/safe-fetch";

describe("safeFetch URL guards", () => {
  it("rejects javascript: URLs", async () => {
    await expect(safeFetch("javascript:alert(1)")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  it("rejects loopback hosts", async () => {
    await expect(safeFetch("http://127.0.0.1/feed")).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(safeFetch("http://localhost/feed")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  it("rejects RFC1918 hosts", async () => {
    await expect(safeFetch("http://10.0.0.1/feed")).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(safeFetch("http://192.168.0.1/feed")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  it("rejects unparseable input", async () => {
    await expect(safeFetch("not a url")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});
