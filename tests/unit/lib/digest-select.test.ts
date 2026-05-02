/**
 * @file Tests for the pure digest selection logic.
 */

import { describe, it, expect } from "vitest";
import { selectDigestPosts } from "@/lib/digest/select";
import type { DigestPreferences, PostWithRelations, Publisher, Tag } from "@/lib/types";

const publisher: Publisher = {
  id: "pub-1",
  type: "company",
  slug: "stripe",
  name: "Stripe",
  websiteUrl: "https://stripe.com",
  description: null,
  logoUrl: null,
  twitterHandle: null,
  githubHandle: null,
  homeCountry: null,
  defaultAccessLabel: "free",
  defaultPaywallProvider: "unknown",
  isVerified: false,
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const tag: Tag = { id: "tag-1", slug: "react", name: "React", description: null, isFeatured: true };

function post(id: string, opts: Partial<PostWithRelations> = {}): PostWithRelations {
  return {
    id,
    publisherId: publisher.id,
    sourceId: "src-1",
    title: `Post ${id}`,
    summary: null,
    url: `https://stripe.com/${id}`,
    canonicalUrl: `https://stripe.com/${id}`,
    authorName: null,
    publishedAt: "2026-04-25T00:00:00Z",
    readingTimeMin: 5,
    accessLabel: "free",
    paywallProvider: "unknown",
    thumbnailUrl: null,
    rawContentHash: null,
    bodyHtml: null,
    bodySource: null,
    bodyExtractedAt: null,
    bodyFailedAt: null,
    bodyFailedReason: null,
    createdAt: "2026-04-25T00:00:00Z",
    publisher,
    tags: [tag],
    ...opts,
  };
}

const prefs: DigestPreferences = {
  userId: "user-1",
  frequency: "weekly",
  preferredHourUtc: 13,
  includeFollowedPublishers: true,
  includeFollowedTags: true,
  includeAccessLabels: ["free", "paid", "members_only", "mixed"],
  maxPostsPerEmail: 3,
  lastSentAt: null,
};

describe("selectDigestPosts", () => {
  it("limits to maxPostsPerEmail", () => {
    const items = Array.from({ length: 10 }, (_, i) => post(`p${i}`));
    const out = selectDigestPosts({
      preferences: prefs,
      candidates: items,
      followedPublisherIds: [publisher.id],
      followedTagIds: [],
      since: new Date("2026-04-01T00:00:00Z"),
    });
    expect(out).toHaveLength(prefs.maxPostsPerEmail);
  });
  it("filters by access label", () => {
    const out = selectDigestPosts({
      preferences: { ...prefs, includeAccessLabels: ["paid"] },
      candidates: [post("free")],
      followedPublisherIds: [publisher.id],
      followedTagIds: [],
      since: new Date("2026-04-01T00:00:00Z"),
    });
    expect(out).toHaveLength(0);
  });
  it("includes everything when user has no follows", () => {
    const out = selectDigestPosts({
      preferences: prefs,
      candidates: [post("a"), post("b")],
      followedPublisherIds: [],
      followedTagIds: [],
      since: new Date("2026-04-01T00:00:00Z"),
    });
    expect(out).toHaveLength(2);
  });
  it("excludes posts older than `since`", () => {
    const out = selectDigestPosts({
      preferences: prefs,
      candidates: [post("old", { publishedAt: "2026-03-01T00:00:00Z" }), post("new")],
      followedPublisherIds: [publisher.id],
      followedTagIds: [],
      since: new Date("2026-04-01T00:00:00Z"),
    });
    expect(out.map((p) => p.id)).toEqual(["new"]);
  });
});
