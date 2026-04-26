/**
 * @file Heuristic access-label + paywall-provider detector.
 *
 * Looks at the post URL host plus a few content-shape signals to pick
 * the best label out of `free | paid | members_only | mixed`. Pure
 * function — used by the ingestion pipeline and the suggest validator.
 */

import type { AccessLabel, PaywallProvider } from "../types";

export interface DetectAccessInput {
  postUrl: string;
  publisherDefault: AccessLabel;
  publisherDefaultProvider: PaywallProvider;
  bodyHints?: string;
}

export interface DetectAccessOutput {
  accessLabel: AccessLabel;
  paywallProvider: PaywallProvider;
  confidence: "high" | "medium" | "low";
}

const PAID_HINTS = ["paid subscribers only", "this post is for paying subscribers", "members only"];

/** Detect the access label + paywall provider for a single post URL. */
export function detectAccess(input: DetectAccessInput): DetectAccessOutput {
  const lowerHost = (() => {
    try {
      return new URL(input.postUrl).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();

  const provider = inferProvider(lowerHost, input.publisherDefaultProvider);
  const lowerBody = input.bodyHints?.toLowerCase() ?? "";
  const matchesPaid = PAID_HINTS.some((h) => lowerBody.includes(h));

  if (matchesPaid) {
    return { accessLabel: "paid", paywallProvider: provider, confidence: "high" };
  }
  if (lowerHost.includes("substack.com") && lowerBody.includes("free")) {
    return { accessLabel: "mixed", paywallProvider: provider, confidence: "medium" };
  }
  if (lowerHost.includes("medium.com") && lowerBody.includes("members-only")) {
    return { accessLabel: "members_only", paywallProvider: provider, confidence: "medium" };
  }
  return {
    accessLabel: input.publisherDefault,
    paywallProvider: provider,
    confidence: "low",
  };
}

function inferProvider(host: string, fallback: PaywallProvider): PaywallProvider {
  if (host.includes("substack.com")) return "substack";
  if (host.includes("ghost.io")) return "ghost";
  if (host.includes("medium.com")) return "medium";
  if (host.includes("patreon.com")) return "patreon";
  return fallback;
}

/**
 * Quick access-label guess from a website URL alone, used by the
 * suggest validator before any post is fetched.
 */
export function detectAccessLabelFromUrl(websiteUrl: string): AccessLabel {
  let host = "";
  try {
    host = new URL(websiteUrl).hostname.toLowerCase();
  } catch {
    return "free";
  }
  if (host.includes("substack.com") || host.includes("patreon.com")) return "mixed";
  if (host.includes("medium.com")) return "members_only";
  return "free";
}
