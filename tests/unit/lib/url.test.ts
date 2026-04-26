/**
 * @file Tests for `lib/url.ts` — canonicalization, root domain, private host.
 */

import { describe, it, expect } from "vitest";
import { canonicalizeUrl, isPrivateHost, rootDomain } from "@/lib/url";

describe("canonicalizeUrl", () => {
  it("strips utm tracking parameters", () => {
    const out = canonicalizeUrl("https://stripe.com/blog/post?utm_source=twitter&utm_medium=social");
    expect(out).toBe("https://stripe.com/blog/post");
  });
  it("removes the fragment", () => {
    expect(canonicalizeUrl("https://x.com/post#section")).toBe("https://x.com/post");
  });
  it("lowercases the hostname", () => {
    expect(canonicalizeUrl("https://Example.COM/Path")).toBe("https://example.com/Path");
  });
  it("removes default ports", () => {
    expect(canonicalizeUrl("http://example.com:80/page")).toBe("http://example.com/page");
    expect(canonicalizeUrl("https://example.com:443/page")).toBe("https://example.com/page");
  });
  it("sorts remaining query params alphabetically", () => {
    const out = canonicalizeUrl("https://x.com/post?b=2&a=1");
    expect(out).toBe("https://x.com/post?a=1&b=2");
  });
  it("strips trailing slash on non-root paths", () => {
    expect(canonicalizeUrl("https://x.com/post/")).toBe("https://x.com/post");
  });
  it("returns input untouched when unparseable", () => {
    expect(canonicalizeUrl("not a url")).toBe("not a url");
  });
});

describe("isPrivateHost", () => {
  it("flags loopback and RFC1918", () => {
    expect(isPrivateHost("localhost")).toBe(true);
    expect(isPrivateHost("127.0.0.1")).toBe(true);
    expect(isPrivateHost("10.0.0.5")).toBe(true);
    expect(isPrivateHost("192.168.1.1")).toBe(true);
    expect(isPrivateHost("172.20.0.5")).toBe(true);
    expect(isPrivateHost("169.254.10.10")).toBe(true);
  });
  it("does not flag public hosts", () => {
    expect(isPrivateHost("example.com")).toBe(false);
    expect(isPrivateHost("8.8.8.8")).toBe(false);
  });
});

describe("rootDomain", () => {
  it("returns eTLD+1 for multi-segment hostnames", () => {
    expect(rootDomain("blog.engineering.example.com")).toBe("example.com");
  });
  it("returns hostname unchanged for two-segment domains", () => {
    expect(rootDomain("example.com")).toBe("example.com");
  });
});
