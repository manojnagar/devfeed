/**
 * @file Tests for the signed unsubscribe token.
 */

import { describe, it, expect } from "vitest";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "@/lib/digest/unsubscribe-token";

describe("unsubscribe token", () => {
  it("round-trips a userId", () => {
    const token = createUnsubscribeToken("user-1");
    expect(verifyUnsubscribeToken(token)).toBe("user-1");
  });
  it("rejects tampered tokens", () => {
    const token = createUnsubscribeToken("user-1");
    const tampered = `${token}xx`;
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });
  it("rejects malformed tokens", () => {
    expect(verifyUnsubscribeToken("no-dot")).toBeNull();
  });
});
