/**
 * @file Tests for the `cn` class-name utility.
 */

import { describe, it, expect } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("joins multiple class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("dedupes conflicting Tailwind utilities (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("ignores falsy values", () => {
    expect(cn("a", false, null, undefined, "")).toBe("a");
  });
});
