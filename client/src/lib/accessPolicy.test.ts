import { describe, expect, it } from "vitest";
import { freePracticesRemaining, requiresPremiumAccess } from "./accessPolicy";

describe("three-practice access policy", () => {
  it("allows exactly three free completed practices", () => {
    expect(freePracticesRemaining(0)).toBe(3);
    expect(freePracticesRemaining(2)).toBe(1);
    expect(freePracticesRemaining(3)).toBe(0);
  });

  it("gates further practice only when premium access is absent", () => {
    expect(requiresPremiumAccess(3, false)).toBe(true);
    expect(requiresPremiumAccess(2, false)).toBe(false);
    expect(requiresPremiumAccess(3, true)).toBe(false);
  });
});
