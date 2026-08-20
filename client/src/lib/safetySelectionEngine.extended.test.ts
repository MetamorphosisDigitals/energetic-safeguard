import { describe, expect, it } from "vitest";
import { selectSafetyAwareRitual, type SelectableRitual, type SelectionInput } from "./safetySelectionEngine";

const safeOrientation: SelectableRitual = {
  id: "safe-orientation", displayName: "Safe Orientation", active: true, flowCategory: ["reset"], intensityRange: [1, 10], durationMinutes: 1,
  suitableLocations: ["anywhere", "transit"], preferredModality: ["sensory"], accessibilityTags: ["eyes-open", "external-orientation", "discreet"], keywords: ["overwhelmed", "scattered", "anxious"],
  safety: { highIntensityEligible: true, transitSafe: true, requiresExternalOrientation: true },
};
const symbolicPractice: SelectableRitual = {
  id: "symbolic-practice", displayName: "Symbolic Practice", active: true, flowCategory: ["reset", "protect"], intensityRange: [1, 6], durationMinutes: 3,
  suitableLocations: ["home"], preferredModality: ["visualization", "breath"], accessibilityTags: [], keywords: ["overwhelmed", "boundary"],
  safety: { highIntensityEligible: false, transitSafe: false },
};
const rituals = [safeOrientation, symbolicPractice];

function input(overrides: Partial<SelectionInput> = {}): SelectionInput {
  return { pathway: "reset", primaryAnswerTags: ["overwhelmed"], availableMinutes: 2, setting: "home", intensity: 4, adjustments: [], ...overrides };
}

describe("extended safety fallback matrix", () => {
  it.each([
    ["immediate danger", ["immediate-danger"]],
    ["unable to stay safe", ["unable-to-stay-safe"]],
    ["severe physical symptoms", ["severe-physical-symptoms"]],
    ["severe disorientation", ["severe-disorientation"]],
    ["self-harm or harm thoughts", ["self-harm-or-harm-thoughts"]],
  ])("always prioritizes urgent handoff for %s", (_name, safetyTriggers) => {
    const result = selectSafetyAwareRitual(rituals, input({ intensity: 1, safetyTriggers: safetyTriggers as SelectionInput["safetyTriggers"] }));
    expect(result).toMatchObject({ kind: "safety-handoff", reason: "explicit-trigger", priority: "urgent" });
  });

  it.each([7, 8])("filters symbolic, breath-focused options at high intensity %i", (intensity) => {
    const result = selectSafetyAwareRitual(rituals, input({ intensity, adjustments: ["keep-eyes-open"] }));
    expect(result).toMatchObject({ kind: "ritual", appliedSafetyProfile: "high-intensity" });
    if (result.kind === "ritual") expect(result.ritual.id).toBe("safe-orientation");
  });

  it.each([9, 10])("uses a high-priority handoff at very high intensity %i", (intensity) => {
    expect(selectSafetyAwareRitual(rituals, input({ intensity }))).toMatchObject({ kind: "safety-handoff", reason: "very-high-intensity" });
  });

  it("uses the transit-safe candidate even with high intensity and public constraints", () => {
    const result = selectSafetyAwareRitual(rituals, input({ setting: "transit", intensity: 8, adjustments: ["keep-eyes-open", "discreet"] }));
    expect(result).toMatchObject({ kind: "ritual", appliedSafetyProfile: "transit-safe" });
  });

  it("falls back safely when zero time leaves no compatible ritual", () => {
    expect(selectSafetyAwareRitual(rituals, input({ availableMinutes: 0 }))).toMatchObject({ kind: "safety-handoff", reason: "no-safe-ritual" });
  });

  it("preserves an accessible sensory fallback when conflicting symbolic modalities are excluded", () => {
    const result = selectSafetyAwareRitual(rituals, input({ adjustments: ["avoid-visualization", "avoid-breath", "minimal-movement", "keep-eyes-open", "discreet"] }));
    expect(result).toMatchObject({ kind: "ritual" });
    if (result.kind === "ritual") expect(result.ritual.id).toBe("safe-orientation");
  });

  it("does not select an unrelated ritual when a malformed pathway arrives", () => {
    expect(selectSafetyAwareRitual(rituals, input({ pathway: "unknown-pathway" }))).toMatchObject({ kind: "safety-handoff", reason: "no-safe-ritual" });
  });

  it.each([-1, 11, Number.NaN])("fails closed for out-of-range intensity %s", (intensity) => {
    expect(selectSafetyAwareRitual(rituals, input({ intensity }))).toMatchObject({ kind: "safety-handoff", reason: "no-safe-ritual" });
  });
});
