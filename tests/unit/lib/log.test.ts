/**
 * @file Tests for the structured logger and its redaction behaviour.
 */

import { describe, it, expect } from "vitest";
import { sanitizeContext, sanitizeValue } from "@/lib/log";

describe("sanitizeValue", () => {
  it("strips CR/LF from strings", () => {
    expect(sanitizeValue("hello\nworld\rrest")).toBe("hello world rest");
  });
  it("redacts secret-looking values", () => {
    expect(sanitizeValue("sk_live_ABCDEFGHIJ123")).toBe("[REDACTED]");
    expect(sanitizeValue("ghp_" + "a".repeat(36))).toBe("[REDACTED]");
  });
  it("recurses into arrays + objects", () => {
    expect(sanitizeValue(["a", "b"])).toEqual(["a", "b"]);
    expect(sanitizeValue({ token: "abc" })).toEqual({ token: "[REDACTED]" });
  });
});

describe("sanitizeContext", () => {
  it("redacts known sensitive keys", () => {
    const out = sanitizeContext({ password: "x", normal: "y" });
    expect(out.password).toBe("[REDACTED]");
    expect(out.normal).toBe("y");
  });
});
