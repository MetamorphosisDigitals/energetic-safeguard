import { describe, expect, it } from "vitest";
import { findCanonicalRitual } from "@/data/canonicalRituals";
import { selectLiveSafetyAwarePractice } from "./liveSafetySelection";

const resetQuery = {
  pathway: "reset" as const,
  situation: "I feel scattered",
  intensity: 5,
  energy: "steady" as const,
  availableMinutes: 3,
  location: "anywhere" as const,
  style: "practical" as const,
  adjustments: [],
  enabledContentPackIds: ["foundation" as const],
};

describe("live safety selection bridge", () => {
  it("returns an active ritual before the recommendation screen for a standard request", () => {
    const result = selectLiveSafetyAwarePractice(resetQuery);
    expect(result.kind).toBe("ritual");
    if (result.kind === "ritual") expect(result.ritual.flowCategory).toContain("reset");
  });

  it("routes urgent language to a safety handoff before a ritual can be selected", () => {
    const result = selectLiveSafetyAwarePractice({ ...resetQuery, situation: "I feel unsafe and cannot stay safe" });
    expect(result).toMatchObject({ kind: "safety-handoff", reason: "explicit-trigger", priority: "urgent" });
  });

  it("uses only externally oriented rituals at high intensity and hands off at very high intensity", () => {
    const high = selectLiveSafetyAwarePractice({ ...resetQuery, intensity: 8 });
    expect(high.kind).toBe("ritual");
    if (high.kind === "ritual") expect(high.appliedSafetyProfile).toBe("high-intensity");

    const veryHigh = selectLiveSafetyAwarePractice({ ...resetQuery, intensity: 9 });
    expect(veryHigh).toMatchObject({ kind: "safety-handoff", reason: "very-high-intensity", priority: "high" });
  });

  it("selects a transit-safe ritual when the live query identifies transit", () => {
    const result = selectLiveSafetyAwarePractice({ ...resetQuery, location: "transit" });
    expect(result.kind).toBe("ritual");
    if (result.kind === "ritual") expect(result.ritual.id).toBe("five-sense-orientation");
  });

  it("safety-checks an explicitly selected canonical daily-plan ritual before it can render", () => {
    const selected = findCanonicalRitual("transition-pause");
    expect(selected).toBeDefined();
    if (!selected) return;

    const result = selectLiveSafetyAwarePractice({
      ...resetQuery,
      pathway: selected.flowCategory[0],
      situation: "I want a daily energy hygiene practice",
      intensity: Math.min(selected.intensityRange[1], Math.max(selected.intensityRange[0], 5)),
      availableMinutes: Math.max(3, selected.durationMinutes),
    }, [selected.id]);

    expect(result).toMatchObject({ kind: "ritual", ritual: { id: "transition-pause" } });
  });
});
