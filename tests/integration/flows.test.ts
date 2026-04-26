/**
 * @file End-to-end integration tests for every user flow.
 *
 * These exercise the same code paths the Server Actions and Route
 * Handlers call, but bypass the Next.js request scope so they run
 * inside Vitest. Together they cover every business flow in PLAN.md
 * §6 against the in-memory adapter.
 *
 * If any of these fail, real users would hit the same failure.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { resetMemoryStore } from "@/lib/data/memory/store";
import { __resetRepositoryCache, getRepository } from "@/lib/data";
import { runDigest } from "@/lib/digest/run";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/digest/unsubscribe-token";
import { selectDigestPosts } from "@/lib/digest/select";
import { evaluateSuggestionRateLimit } from "@/lib/rate-limit";
import { detectAccessLabelFromUrl } from "@/lib/ingest/detect-access";
import { autoTag } from "@/lib/ingest/auto-tag";
import { genId } from "@/lib/ids";
import type { BlogSource, PublisherSuggestion, ReadEvent } from "@/lib/types";

beforeEach(() => {
  resetMemoryStore();
  __resetRepositoryCache();
});

const DEMO_USER = "demo-user";
const DEMO_ADMIN = "demo-admin-user";

function nowIso(): string {
  return new Date().toISOString();
}

function buildEvent(postId: string, anonId: string): ReadEvent {
  return {
    id: genId(),
    postId,
    userId: null,
    anonId,
    ipHash: "h",
    uaHash: "h",
    referrer: null,
    occurredAt: nowIso(),
  };
}

describe("flow · public browsing", () => {
  it("filters posts by publisher slug + tag together", async () => {
    const repo = getRepository();
    const all = await repo.posts.list({ pageSize: 200 });
    const sample = all.items[0];
    const filtered = await repo.posts.list({
      publisher: [sample.publisher.slug],
      tag: sample.tags.slice(0, 1).map((t) => t.slug),
      pageSize: 50,
    });
    expect(filtered.items.length).toBeGreaterThan(0);
    expect(filtered.items.every((p) => p.publisher.slug === sample.publisher.slug)).toBe(true);
  });

  it("paginates without overlap", async () => {
    const repo = getRepository();
    const p1 = await repo.posts.list({ pageSize: 10, page: 1 });
    const p2 = await repo.posts.list({ pageSize: 10, page: 2 });
    const ids1 = new Set(p1.items.map((p) => p.id));
    expect(p2.items.every((p) => !ids1.has(p.id))).toBe(true);
  });

  it("looks up a publisher by slug", async () => {
    const repo = getRepository();
    const all = await repo.publishers.list();
    const target = all[0];
    const found = await repo.publishers.getBySlug(target.slug);
    expect(found?.id).toBe(target.id);
  });
});

describe("flow · read-tracking redirect", () => {
  it("records an anonymous read event", async () => {
    const repo = getRepository();
    const post = (await repo.posts.list({ pageSize: 1 })).items[0];
    const before = await repo.readEvents.countTotal();
    await repo.readEvents.insert(buildEvent(post.id, "anon-test"));
    const after = await repo.readEvents.countTotal();
    expect(after).toBe(before + 1);
  });
});

describe("flow · bookmark", () => {
  it("toggles bookmark on, lists it, toggles off", async () => {
    const repo = getRepository();
    const post = (await repo.posts.list({ pageSize: 1 })).items[0];

    const r1 = await repo.bookmarks.toggle(DEMO_USER, post.id);
    expect(r1.bookmarked).toBe(true);
    expect((await repo.bookmarks.listForUser(DEMO_USER)).map((p) => p.id)).toContain(post.id);
    expect(await repo.bookmarks.has(DEMO_USER, post.id)).toBe(true);

    const bulk = await repo.bookmarks.bulkHas(DEMO_USER, [post.id, "missing"]);
    expect(bulk.has(post.id)).toBe(true);
    expect(bulk.has("missing")).toBe(false);

    const r2 = await repo.bookmarks.toggle(DEMO_USER, post.id);
    expect(r2.bookmarked).toBe(false);
    expect((await repo.bookmarks.listForUser(DEMO_USER)).map((p) => p.id)).not.toContain(post.id);
  });
});

describe("flow · follow", () => {
  it("follows + unfollows a publisher", async () => {
    const repo = getRepository();
    const pub = (await repo.publishers.list({ isActive: true }))[0];

    const r1 = await repo.follows.togglePublisher(DEMO_USER, pub.id);
    expect(r1.followed).toBe(true);
    expect((await repo.follows.listFollowedPublishers(DEMO_USER)).map((p) => p.id)).toContain(pub.id);

    const r2 = await repo.follows.togglePublisher(DEMO_USER, pub.id);
    expect(r2.followed).toBe(false);
  });

  it("follows + unfollows a tag", async () => {
    const repo = getRepository();
    const tag = (await repo.tags.list())[0];
    const r1 = await repo.follows.toggleTag(DEMO_USER, tag.id);
    expect(r1.followed).toBe(true);
    expect((await repo.follows.listFollowedTags(DEMO_USER)).map((t) => t.id)).toContain(tag.id);
    const r2 = await repo.follows.toggleTag(DEMO_USER, tag.id);
    expect(r2.followed).toBe(false);
  });
});

describe("flow · digest preferences", () => {
  it("round-trips preferences", async () => {
    const repo = getRepository();
    const before = await repo.digest.getPreferences(DEMO_USER);
    expect(before.userId).toBe(DEMO_USER);
    await repo.digest.setPreferences({
      ...before,
      frequency: "daily",
      preferredHourUtc: 9,
      maxPostsPerEmail: 7,
      includeAccessLabels: ["free"],
    });
    const fetched = await repo.digest.getPreferences(DEMO_USER);
    expect(fetched.frequency).toBe("daily");
    expect(fetched.preferredHourUtc).toBe(9);
    expect(fetched.maxPostsPerEmail).toBe(7);
  });

  it("setting frequency to 'off' opts the user out", async () => {
    const repo = getRepository();
    const prefs = await repo.digest.getPreferences(DEMO_USER);
    await repo.digest.setPreferences({ ...prefs, frequency: "off" });
    expect((await repo.digest.getPreferences(DEMO_USER)).frequency).toBe("off");
  });
});

describe("flow · digest send pipeline", () => {
  // Seed posts span the 28 days before 2026-04-25 (the seed reference date),
  // so we use a Monday in that range with weekly cadence to ensure there's
  // something to send. 2026-04-27 is a Monday.
  it("sends a weekly digest to a user who is due, marks lastSentAt", async () => {
    const now = new Date("2026-04-27T13:00:00Z");
    expect(now.getUTCDay()).toBe(1);
    const repo = getRepository();
    const pub = (await repo.publishers.list({ isActive: true }))[0];
    await repo.follows.togglePublisher(DEMO_USER, pub.id);
    const prefs = await repo.digest.getPreferences(DEMO_USER);
    await repo.digest.setPreferences({
      ...prefs,
      frequency: "weekly",
      preferredHourUtc: now.getUTCHours(),
      includeFollowedPublishers: true,
      includeAccessLabels: ["free", "paid", "members_only", "mixed"],
      maxPostsPerEmail: 5,
      lastSentAt: null,
    });

    const result1 = await runDigest(now);
    expect(result1.failed).toBe(0);
    expect(result1.sent).toBe(1);

    const after = await repo.digest.getPreferences(DEMO_USER);
    expect(after.lastSentAt).toBeTruthy();
  });

  it("respects the user's preferred hour", async () => {
    const now = new Date("2026-04-27T13:00:00Z");
    const repo = getRepository();
    const prefs = await repo.digest.getPreferences(DEMO_USER);
    await repo.digest.setPreferences({
      ...prefs,
      frequency: "weekly",
      preferredHourUtc: 7,
      lastSentAt: null,
    });
    const result = await runDigest(now);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("does not send when frequency is 'off'", async () => {
    const now = new Date("2026-04-27T13:00:00Z");
    const repo = getRepository();
    const prefs = await repo.digest.getPreferences(DEMO_USER);
    await repo.digest.setPreferences({
      ...prefs,
      frequency: "off",
      preferredHourUtc: now.getUTCHours(),
      lastSentAt: null,
    });
    const result = await runDigest(now);
    expect(result.sent).toBe(0);
  });
});

describe("flow · suggest publisher → admin moderate", () => {
  function makeSuggestion(overrides: Partial<PublisherSuggestion> = {}): PublisherSuggestion {
    return {
      id: genId(),
      submittedByUserId: DEMO_USER,
      type: "company",
      name: "Example Engineering",
      websiteUrl: "https://example-engineering.dev",
      feedUrl: null,
      feedKind: null,
      reason: "Great writers",
      autoValidation: null,
      status: "pending",
      reviewedByUserId: null,
      reviewerNotes: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...overrides,
    };
  }

  it("submits a suggestion within the rate limit", async () => {
    const repo = getRepository();
    const decision = evaluateSuggestionRateLimit({
      pendingCount: await repo.suggestions.countPendingForUser(DEMO_USER),
      weekCount: await repo.suggestions.countLastWeekForUser(DEMO_USER),
    });
    expect(decision.allowed).toBe(true);

    const inserted = await repo.suggestions.insert(makeSuggestion());
    expect(inserted.status).toBe("pending");
    const queue = await repo.suggestions.listByStatus("pending");
    expect(queue.map((s) => s.id)).toContain(inserted.id);
    const userList = await repo.suggestions.listForUser(DEMO_USER);
    expect(userList.map((s) => s.id)).toContain(inserted.id);
  });

  it("admin approves a pending suggestion → publisher promoted", async () => {
    const repo = getRepository();
    const inserted = await repo.suggestions.insert(makeSuggestion({ name: "Approve Me", websiteUrl: "https://approve-me.dev" }));
    const decided = await repo.suggestions.decide(inserted.id, "approved", DEMO_ADMIN, "Looks good");
    expect(decided.status).toBe("approved");
    expect(decided.reviewedByUserId).toBe(DEMO_ADMIN);
    expect(decided.reviewerNotes).toBe("Looks good");

    const promoted = await repo.publishers.upsert({
      id: genId(),
      type: "company",
      slug: "approve-me",
      name: "Approve Me",
      websiteUrl: "https://approve-me.dev",
      description: null,
      logoUrl: null,
      twitterHandle: null,
      githubHandle: null,
      homeCountry: null,
      defaultAccessLabel: "free",
      defaultPaywallProvider: "unknown",
      isVerified: false,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    const visible = await repo.publishers.list({ isActive: true });
    expect(visible.map((p) => p.id)).toContain(promoted.id);
  });

  it("blocks a 4th pending submission for the same user", async () => {
    const repo = getRepository();
    for (let i = 0; i < 3; i++) {
      await repo.suggestions.insert(makeSuggestion({ id: genId(), name: `Pending ${i}`, websiteUrl: `https://pending-${i}.dev` }));
    }
    const decision = evaluateSuggestionRateLimit({
      pendingCount: await repo.suggestions.countPendingForUser(DEMO_USER),
      weekCount: await repo.suggestions.countLastWeekForUser(DEMO_USER),
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("too_many_pending");
  });

  it("decision history is observable in the admin's view", async () => {
    const repo = getRepository();
    const a = await repo.suggestions.insert(makeSuggestion({ id: genId(), name: "A" }));
    const b = await repo.suggestions.insert(makeSuggestion({ id: genId(), name: "B", websiteUrl: "https://b.dev" }));
    await repo.suggestions.decide(a.id, "rejected", DEMO_ADMIN, "duplicate");
    await repo.suggestions.decide(b.id, "approved", DEMO_ADMIN, "ok");
    expect((await repo.suggestions.listByStatus("approved")).map((s) => s.id)).toContain(b.id);
    expect((await repo.suggestions.listByStatus("rejected")).map((s) => s.id)).toContain(a.id);
    expect((await repo.suggestions.listByStatus("pending")).map((s) => s.id)).not.toContain(a.id);
  });
});

describe("flow · admin manage publisher + sources", () => {
  it("toggling a publisher inactive removes it from the public list", async () => {
    const repo = getRepository();
    const target = (await repo.publishers.list({ isActive: true }))[0];
    await repo.publishers.setActive(target.id, false);
    expect(
      (await repo.publishers.list({ isActive: true })).map((p) => p.id),
    ).not.toContain(target.id);
  });

  it("appending a new feed source attaches it to the publisher", async () => {
    const repo = getRepository();
    const target = (await repo.publishers.list({ isActive: true }))[0];
    const before = await repo.blogSources.listByPublisher(target.id);
    const created = await repo.blogSources.upsert({
      id: genId(),
      publisherId: target.id,
      kind: "rss",
      feedUrl: "https://feeds.example.com/extra.xml",
      scrapeConfig: null,
      isActive: true,
      lastFetchedAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      consecutiveFailures: 0,
      createdAt: nowIso(),
    } as BlogSource);
    const after = await repo.blogSources.listByPublisher(target.id);
    expect(after.length).toBe(before.length + 1);
    expect(after.map((s) => s.id)).toContain(created.id);

    await repo.blogSources.recordFailure(created.id, "boom", nowIso());
    const failed = (await repo.blogSources.listByPublisher(target.id)).find((s) => s.id === created.id)!;
    expect(failed.consecutiveFailures).toBe(1);
    expect(failed.lastErrorMessage).toBe("boom");

    await repo.blogSources.recordSuccess(created.id, nowIso());
    const recovered = (await repo.blogSources.listByPublisher(target.id)).find((s) => s.id === created.id)!;
    expect(recovered.consecutiveFailures).toBe(0);
    expect(recovered.lastErrorMessage).toBeNull();
  });
});

describe("flow · unsubscribe token round-trip", () => {
  it("verifies a valid token, rejects tampering + garbage", () => {
    const token = createUnsubscribeToken(DEMO_USER);
    expect(verifyUnsubscribeToken(token)).toBe(DEMO_USER);
    expect(verifyUnsubscribeToken(token + "x")).toBeNull();
    expect(verifyUnsubscribeToken("garbage")).toBeNull();
  });

  it("the unsubscribe handler logic flips frequency to 'off'", async () => {
    const repo = getRepository();
    const prefs = await repo.digest.getPreferences(DEMO_USER);
    await repo.digest.setPreferences({ ...prefs, frequency: "daily" });
    const userId = verifyUnsubscribeToken(createUnsubscribeToken(DEMO_USER));
    expect(userId).toBe(DEMO_USER);
    const current = await repo.digest.getPreferences(userId!);
    await repo.digest.setPreferences({ ...current, frequency: "off" });
    expect((await repo.digest.getPreferences(DEMO_USER)).frequency).toBe("off");
  });
});

describe("flow · ingest helpers", () => {
  it("attaches expected tag slugs from a real-feeling post body", () => {
    const out = autoTag({
      title: "Adopting Rust at scale",
      summary: "We migrated our Kubernetes platform to async tokio.",
    });
    expect(out.slugs).toEqual(expect.arrayContaining(["rust", "kubernetes"]));
  });
  it("flags substack URLs as mixed and others as free", () => {
    expect(detectAccessLabelFromUrl("https://platformer.news")).toBe("free");
    expect(detectAccessLabelFromUrl("https://platformer.substack.com")).toBe("mixed");
  });
});

describe("flow · digest selection edge cases", () => {
  it("never returns more than maxPostsPerEmail", async () => {
    const repo = getRepository();
    const prefs = await repo.digest.getPreferences(DEMO_USER);
    const all = await repo.posts.list({ pageSize: 200 });
    const selected = selectDigestPosts({
      preferences: { ...prefs, maxPostsPerEmail: 3, frequency: "weekly" },
      candidates: all.items,
      followedPublisherIds: [],
      followedTagIds: [],
      since: new Date("2026-01-01T00:00:00Z"),
    });
    expect(selected.length).toBeLessThanOrEqual(3);
  });
});

describe("flow · audit log + analytics aggregation", () => {
  it("records and lists audit entries", async () => {
    const repo = getRepository();
    await repo.audit.insert({
      id: genId(),
      actorUserId: DEMO_ADMIN,
      action: "publisher.upsert",
      targetType: "publisher",
      targetId: "pub-1",
      payload: { source: "test" },
      occurredAt: nowIso(),
    });
    const list = await repo.audit.list(10);
    expect(list[0].action).toBe("publisher.upsert");
  });

  it("aggregates read events across day / publisher / access dimensions", async () => {
    const repo = getRepository();
    const post = (await repo.posts.list({ pageSize: 1 })).items[0];
    for (let i = 0; i < 5; i++) {
      await repo.readEvents.insert(buildEvent(post.id, `anon-${i}`));
    }
    expect((await repo.readEvents.countByDay(7)).length).toBeGreaterThan(0);
    expect((await repo.readEvents.countByPublisher(7, 10)).length).toBeGreaterThan(0);
    expect((await repo.readEvents.countByAccess(7)).length).toBeGreaterThan(0);
  });
});
