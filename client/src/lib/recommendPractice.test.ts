import { describe, expect, it } from "vitest";
import { recommendPractice } from "./recommendPractice";

const baseQuery = {
  pathway: "morning" as const,
  situation: "I feel scattered at the start of the day",
  intensity: 3,
  energy: "steady" as const,
  availableMinutes: 3,
  location: "home" as const,
  style: "practical" as const,
  adjustments: [],
};

describe("recommendPractice", () => {
  it("selects a compatible practice from the active foundation pack", () => {
    const practice = recommendPractice({ ...baseQuery, enabledContentPackIds: ["foundation"] });
    expect(practice.flowCategory).toContain("morning");
    expect(practice.contentPackId ?? "foundation").toBe("foundation");
  });

  it("keeps practical recommendations compatible with selected accessibility adjustments", () => {
    const practice = recommendPractice({ ...baseQuery, pathway: "reset", adjustments: ["keep-eyes-open", "minimal-movement"] });
    expect(practice.accessibilityTags).toContain("eyes-open");
    expect(practice.preferredModality).not.toContain("movement");
  });

  it("filters by Rose Ray and crystal metadata without any UI-specific rule", () => {
    const practice = recommendPractice({
      ...baseQuery,
      pathway: "protect",
      style: "rose-crystal",
      preferredRoseRayId: "black-rose",
      preferredCrystalId: "black-tourmaline",
      requiresCrystalSupport: true,
    });
    expect(practice.roseRayId).toBe("black-rose");
    expect(practice.crystalSupportIds).toContain("black-tourmaline");
  });
});
