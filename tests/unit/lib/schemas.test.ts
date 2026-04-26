/**
 * @file Tests for zod input schemas.
 */

import { describe, it, expect } from "vitest";
import {
  DigestPreferencesInputSchema,
  FilterQuerySchema,
  PublisherSuggestionInputSchema,
  SuggestionDecisionSchema,
} from "@/lib/schemas";

describe("PublisherSuggestionInputSchema", () => {
  it("requires a non-empty name and url", () => {
    const r = PublisherSuggestionInputSchema.safeParse({
      type: "company",
      name: "X",
      websiteUrl: "https://example.com",
    });
    expect(r.success).toBe(false);
  });
  it("accepts a valid suggestion", () => {
    const r = PublisherSuggestionInputSchema.safeParse({
      type: "person",
      name: "Jane Doe",
      websiteUrl: "https://janedoe.dev",
      feedUrl: null,
      reason: "Great writer",
    });
    expect(r.success).toBe(true);
  });
  it("rejects non-http URLs", () => {
    const r = PublisherSuggestionInputSchema.safeParse({
      type: "company",
      name: "Bad",
      websiteUrl: "javascript:alert(1)",
    });
    expect(r.success).toBe(false);
  });
});

describe("FilterQuerySchema", () => {
  it("splits comma-separated lists", () => {
    const r = FilterQuerySchema.parse({ type: "company,person", tag: "ai,go" });
    expect(r.type).toEqual(["company", "person"]);
    expect(r.tag).toEqual(["ai", "go"]);
  });
  it("returns empty arrays for missing inputs", () => {
    const r = FilterQuerySchema.parse({});
    expect(r.type).toEqual([]);
    expect(r.tag).toEqual([]);
  });
});

describe("DigestPreferencesInputSchema", () => {
  it("requires at least one access label", () => {
    const r = DigestPreferencesInputSchema.safeParse({
      frequency: "daily",
      preferredHourUtc: 12,
      includeFollowedPublishers: true,
      includeFollowedTags: true,
      includeAccessLabels: [],
      maxPostsPerEmail: 5,
    });
    expect(r.success).toBe(false);
  });
  it("rejects out-of-range hour", () => {
    const r = DigestPreferencesInputSchema.safeParse({
      frequency: "daily",
      preferredHourUtc: 25,
      includeFollowedPublishers: true,
      includeFollowedTags: true,
      includeAccessLabels: ["free"],
      maxPostsPerEmail: 5,
    });
    expect(r.success).toBe(false);
  });
});

describe("SuggestionDecisionSchema", () => {
  it("validates uuid + decision", () => {
    const r = SuggestionDecisionSchema.safeParse({
      suggestionId: "00000000-0000-4000-8000-000000000000",
      decision: "approve",
    });
    expect(r.success).toBe(true);
  });
});
