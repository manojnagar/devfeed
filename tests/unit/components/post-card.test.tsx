/**
 * @file Tests for the PostCard component.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostCard } from "@/components/post/post-card";
import type { PostWithRelations } from "@/lib/types";

const post: PostWithRelations = {
  id: "post-1",
  publisherId: "pub-1",
  sourceId: "src-1",
  title: "How we scaled Postgres to 100TB",
  summary: "A long story about scaling our primary database.",
  url: "https://stripe.com/blog/scale",
  canonicalUrl: "https://stripe.com/blog/scale",
  authorName: "Alice",
  publishedAt: "2026-04-25T00:00:00Z",
  readingTimeMin: 7,
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
  publisher: {
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
  },
  tags: [{ id: "tag-1", slug: "databases", name: "Databases", description: null, isFeatured: true }],
};

describe("<PostCard />", () => {
  it("renders the title and publisher name", () => {
    render(<PostCard post={post} />);
    expect(screen.getByText(post.title)).toBeInTheDocument();
    expect(screen.getByText("Stripe")).toBeInTheDocument();
  });
  it("makes the entire card a clickable link to the in-app preview", () => {
    render(<PostCard post={post} />);
    const stretched = screen.getByRole("link", { name: /Preview:/ });
    expect(stretched.getAttribute("href")).toBe("/posts/post-1");
  });
  it("does NOT link the title to the external out-redirect (preview happens via the card link)", () => {
    render(<PostCard post={post} />);
    expect(screen.queryByRole("link", { name: post.title })).toBeNull();
  });
  it("publisher name remains an independent link", () => {
    render(<PostCard post={post} />);
    expect(
      screen.getByRole("link", { name: "Stripe" }).getAttribute("href"),
    ).toBe("/publishers/stripe");
  });
  it("shows tag pills with their own links", () => {
    render(<PostCard post={post} />);
    expect(screen.getByText("#databases")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "#databases" }).getAttribute("href"),
    ).toBe("/tags/databases");
  });
});
