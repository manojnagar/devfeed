/**
 * @file Tests against the in-memory repository.
 *
 * Uses the deterministic seed dataset, so counts and slugs are stable.
 * Every test resets the in-memory store first to avoid bleed-over.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { resetMemoryStore } from "@/lib/data/memory/store";
import { __resetRepositoryCache, getRepository } from "@/lib/data";

beforeEach(() => {
  resetMemoryStore();
  __resetRepositoryCache();
});

describe("publishers repo", () => {
  it("seeds at least 40 companies + 5 people", async () => {
    const all = await getRepository().publishers.list({ isActive: true });
    expect(all.length).toBeGreaterThanOrEqual(45);
    const companies = all.filter((p) => p.type === "company");
    const people = all.filter((p) => p.type === "person");
    expect(companies.length).toBeGreaterThanOrEqual(40);
    expect(people.length).toBeGreaterThanOrEqual(5);
  });
  it("filters by type", async () => {
    const people = await getRepository().publishers.list({ type: ["person"], isActive: true });
    expect(people.every((p) => p.type === "person")).toBe(true);
  });
  it("looks up by slug", async () => {
    const all = await getRepository().publishers.list();
    const target = all[0];
    expect(target).toBeDefined();
    const found = await getRepository().publishers.getBySlug(target.slug);
    expect(found?.id).toBe(target.id);
  });
});

describe("posts repo", () => {
  it("paginates results", async () => {
    const page = await getRepository().posts.list({ pageSize: 5, page: 1 });
    expect(page.items.length).toBeLessThanOrEqual(5);
    expect(page.total).toBeGreaterThan(0);
  });
  it("filters by publisher slug", async () => {
    const repo = getRepository();
    const publishers = await repo.publishers.list({ isActive: true });
    const slug = publishers[0].slug;
    const page = await repo.posts.list({ publisher: [slug], pageSize: 50 });
    expect(page.items.every((p) => p.publisher.slug === slug)).toBe(true);
  });
});

describe("bookmarks repo", () => {
  it("toggles a bookmark on and off", async () => {
    const repo = getRepository();
    const post = (await repo.posts.list({ pageSize: 1 })).items[0];
    expect(post).toBeDefined();
    const r1 = await repo.bookmarks.toggle("demo-user", post.id);
    expect(r1.bookmarked).toBe(true);
    const r2 = await repo.bookmarks.toggle("demo-user", post.id);
    expect(r2.bookmarked).toBe(false);
  });
});

describe("digest repo", () => {
  it("returns sane defaults for unknown users", async () => {
    const prefs = await getRepository().digest.getPreferences("brand-new-user");
    expect(prefs.frequency).toBe("weekly");
    expect(prefs.includeAccessLabels.length).toBeGreaterThan(0);
  });
});
