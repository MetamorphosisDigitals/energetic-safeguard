import { describe, expect, it } from "vitest";
import { energyHygieneMoments } from "./catalog";
import { canonicalRituals, findPracticeInCentralizedLibrary } from "./canonicalRituals";

describe("canonical ritual adapter", () => {
  it("exposes the confirmed 18-ritual source of truth", () => {
    expect(canonicalRituals).toHaveLength(18);
  });

  it("maps each energy-hygiene route to a ritual from the confirmed catalog", () => {
    for (const moment of energyHygieneMoments) {
      expect(canonicalRituals.some((ritual) => ritual.id === moment.suggestedPracticeId)).toBe(true);
      expect(findPracticeInCentralizedLibrary(moment.suggestedPracticeId)?.id).toBe(moment.suggestedPracticeId);
    }
  });
});
