import { describe, expect, it } from "vitest";
import { selectSafetyAwareRitual, type SelectableRitual } from "./safetySelectionEngine";

const rituals: SelectableRitual[] = [
  {
    id: "safe-orientation", displayName: "Safe Orientation", active: true, flowCategory: ["reset"], intensityRange: [1, 10], durationMinutes: 1,
    suitableLocations: ["anywhere", "transit"], preferredModality: ["sensory"], accessibilityTags: ["eyes-open", "external-orientation", "discreet"], keywords: ["overwhelmed", "scattered"],
    safety: { highIntensityEligible: true, transitSafe: true, requiresExternalOrientation: true },
  },
  {
    id: "visual-only", displayName: "Visual Practice", active: true, flowCategory: ["reset"], intensityRange: [1, 8], durationMinutes: 3,
    suitableLocations: ["home"], preferredModality: ["visualization"], accessibilityTags: [], keywords: ["overwhelmed"],
    safety: { highIntensityEligible: false, transitSafe: false },
  },
];

describe("selectSafetyAwareRitual", () => {
  it("returns a safety handoff before evaluating rituals when an explicit trigger is present", () => {
    const result = selectSafetyAwareRitual(rituals, { pathway: "reset", primaryAnswerTags: ["overwhelmed"], availableMinutes: 2, setting: "home", adjustments: [], safetyTriggers: ["immediate-danger"] });
    expect(result).toMatchObject({ kind: "safety-handoff", reason: "explicit-trigger", priority: "urgent" });
  });

  it("uses only high-intensity eligible, eyes-open orientation at intensity seven or eight", () => {
    const result = selectSafetyAwareRitual(rituals, { pathway: "reset", primaryAnswerTags: ["overwhelmed"], availableMinutes: 2, setting: "transit", intensity: 8, adjustments: ["keep-eyes-open"] });
    expect(result).toMatchObject({ kind: "ritual", appliedSafetyProfile: "transit-safe" });
    if (result.kind === "ritual") expect(result.ritual.id).toBe("safe-orientation");
  });

  it("returns a high-priority handoff at intensity nine or ten", () => {
    const result = selectSafetyAwareRitual(rituals, { pathway: "reset", primaryAnswerTags: ["overwhelmed"], availableMinutes: 2, setting: "home", intensity: 9, adjustments: [] });
    expect(result).toMatchObject({ kind: "safety-handoff", reason: "very-high-intensity", priority: "high" });
  });
});
