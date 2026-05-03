/**
 * @file Unit tests for `lib/publisher-logo`.
 *
 * Covers the multi-candidate fallback chain that powers the Avatar
 * primitive's logo resolution: per-host icon paths
 * (`apple-touch-icon.png`, `apple-touch-icon-precomposed.png`,
 * `favicon.ico`), subdomain → apex fallback, multi-tenant platform
 * skipping (Medium, Tumblr, Substack, …) and admin override
 * authority. The legacy single-URL helpers (`deriveFaviconUrl`,
 * `resolvePublisherLogo`) are also asserted here so any future change
 * that breaks backward compatibility surfaces immediately.
 */

import { describe, expect, it } from "vitest";
import {
  deriveFaviconCandidates,
  deriveFaviconUrl,
  resolvePublisherLogo,
  resolvePublisherLogoCandidates,
} from "@/lib/publisher-logo";

describe("deriveFaviconCandidates", () => {
  it("emits per-host icon paths in priority order", () => {
    expect(deriveFaviconCandidates("https://stripe.com/blog")).toEqual([
      "https://stripe.com/apple-touch-icon.png",
      "https://stripe.com/apple-touch-icon-precomposed.png",
      "https://stripe.com/favicon.ico",
    ]);
  });

  it("preserves protocol and port (URL constructor lowercases the host)", () => {
    expect(deriveFaviconCandidates("https://Engineering.Example.COM:8443/x/y")).toEqual([
      "https://engineering.example.com:8443/apple-touch-icon.png",
      "https://engineering.example.com:8443/apple-touch-icon-precomposed.png",
      "https://engineering.example.com:8443/favicon.ico",
      // Apex fallback for the 3-label subdomain.
      "https://example.com:8443/apple-touch-icon.png",
      "https://example.com:8443/apple-touch-icon-precomposed.png",
      "https://example.com:8443/favicon.ico",
    ]);
  });

  it("appends the apex domain for 3+ label subdomains (engineering.linkedin.com → linkedin.com)", () => {
    const out = deriveFaviconCandidates("https://engineering.linkedin.com/");
    expect(out).toContain("https://engineering.linkedin.com/apple-touch-icon.png");
    expect(out).toContain("https://linkedin.com/apple-touch-icon.png");
    expect(out).toContain("https://linkedin.com/favicon.ico");
    // Apex-only candidates must come *after* the publisher-host
    // candidates so we always prefer the more specific source.
    const subIdx = out.indexOf("https://engineering.linkedin.com/favicon.ico");
    const apexIdx = out.indexOf("https://linkedin.com/apple-touch-icon.png");
    expect(subIdx).toBeGreaterThan(-1);
    expect(apexIdx).toBeGreaterThan(subIdx);
  });

  it("does not synthesise an apex variant for 2-label hosts (groupon.engineering stays as-is)", () => {
    expect(deriveFaviconCandidates("https://groupon.engineering/")).toEqual([
      "https://groupon.engineering/apple-touch-icon.png",
      "https://groupon.engineering/apple-touch-icon-precomposed.png",
      "https://groupon.engineering/favicon.ico",
    ]);
  });

  it("returns no candidates for multi-tenant platforms on a non-root path", () => {
    // Medium serves Medium's own `M` favicon for every account beneath
    // it — surfacing that as the publisher's logo is misleading, so
    // we deliberately fall through to colored initials.
    expect(deriveFaviconCandidates("https://medium.com/airbnb-engineering")).toEqual([]);
    expect(deriveFaviconCandidates("https://medium.com/feed/airbnb-engineering")).toEqual([]);
    expect(deriveFaviconCandidates("https://yahooeng.tumblr.com/")).toEqual([]);
    expect(deriveFaviconCandidates("https://username.substack.com/")).toEqual([]);
  });

  it("still resolves the bare platform root (medium.com without a path)", () => {
    // medium.com itself is allowed; the favicon there *is* Medium's
    // logo, which is the right answer for a publisher whose website
    // really is medium.com.
    expect(deriveFaviconCandidates("https://medium.com/")).toEqual([
      "https://medium.com/apple-touch-icon.png",
      "https://medium.com/apple-touch-icon-precomposed.png",
      "https://medium.com/favicon.ico",
    ]);
  });

  it("rejects non-http(s) protocols", () => {
    expect(deriveFaviconCandidates("javascript:alert(1)")).toEqual([]);
    expect(deriveFaviconCandidates("file:///etc/passwd")).toEqual([]);
    expect(deriveFaviconCandidates("data:text/html,<script>")).toEqual([]);
  });

  it("returns [] for invalid / missing input", () => {
    expect(deriveFaviconCandidates(null)).toEqual([]);
    expect(deriveFaviconCandidates(undefined)).toEqual([]);
    expect(deriveFaviconCandidates("")).toEqual([]);
    expect(deriveFaviconCandidates("not a url")).toEqual([]);
  });
});

describe("deriveFaviconUrl (legacy single-URL accessor)", () => {
  it("returns the first candidate (apple-touch-icon)", () => {
    expect(deriveFaviconUrl("https://stripe.com/blog")).toBe(
      "https://stripe.com/apple-touch-icon.png",
    );
  });

  it("returns null when there are no candidates", () => {
    expect(deriveFaviconUrl(null)).toBeNull();
    expect(deriveFaviconUrl("https://medium.com/airbnb-engineering")).toBeNull();
  });
});

describe("resolvePublisherLogoCandidates", () => {
  it("returns just the explicit logoUrl when set (admin override is final)", () => {
    expect(
      resolvePublisherLogoCandidates({
        logoUrl: "https://cdn.example.com/logo.png",
        websiteUrl: "https://example.com",
      }),
    ).toEqual(["https://cdn.example.com/logo.png"]);
  });

  it("trims whitespace around an explicit logoUrl", () => {
    expect(
      resolvePublisherLogoCandidates({
        logoUrl: "  https://cdn.example.com/logo.png  ",
        websiteUrl: "https://example.com",
      }),
    ).toEqual(["https://cdn.example.com/logo.png"]);
  });

  it("treats a whitespace-only logoUrl as unset and falls through to derived candidates", () => {
    expect(
      resolvePublisherLogoCandidates({
        logoUrl: "   ",
        websiteUrl: "https://stripe.com",
      }),
    ).toContain("https://stripe.com/apple-touch-icon.png");
  });

  it("returns derived candidates when logoUrl is null", () => {
    const out = resolvePublisherLogoCandidates({
      logoUrl: null,
      websiteUrl: "https://stripe.com",
    });
    expect(out[0]).toBe("https://stripe.com/apple-touch-icon.png");
    expect(out).toContain("https://stripe.com/favicon.ico");
  });

  it("returns [] when both logoUrl and websiteUrl are unusable", () => {
    expect(
      resolvePublisherLogoCandidates({
        logoUrl: null,
        websiteUrl: "" as unknown as string,
      }),
    ).toEqual([]);
    expect(
      resolvePublisherLogoCandidates({
        logoUrl: null,
        websiteUrl: "not a url" as unknown as string,
      }),
    ).toEqual([]);
  });

  it("returns [] for a Medium-hosted publisher (skip platform favicon)", () => {
    expect(
      resolvePublisherLogoCandidates({
        logoUrl: null,
        websiteUrl: "https://medium.com/airbnb-engineering",
      }),
    ).toEqual([]);
  });
});

describe("resolvePublisherLogo (legacy single-URL accessor)", () => {
  it("returns the explicit logoUrl when set", () => {
    expect(
      resolvePublisherLogo({
        logoUrl: "https://cdn.example.com/logo.png",
        websiteUrl: "https://example.com",
      }),
    ).toBe("https://cdn.example.com/logo.png");
  });

  it("returns the first derived candidate when logoUrl is null", () => {
    expect(
      resolvePublisherLogo({
        logoUrl: null,
        websiteUrl: "https://stripe.com",
      }),
    ).toBe("https://stripe.com/apple-touch-icon.png");
  });

  it("returns null for platform-hosted publishers with no admin override", () => {
    expect(
      resolvePublisherLogo({
        logoUrl: null,
        websiteUrl: "https://medium.com/airbnb-engineering",
      }),
    ).toBeNull();
  });
});
