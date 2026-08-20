import { describe, expect, it } from "vitest";
import { energyHygieneMoments, supportFlows } from "./catalog";
import { activeRituals, canonicalRituals, findPracticeInCentralizedLibrary } from "./canonicalRituals";

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

  it("uses only the confirmed library for every active selectable ritual and configured route default", () => {
    expect(activeRituals).toEqual(canonicalRituals);
    for (const flow of supportFlows) {
      if (flow.suggestedPracticeId) expect(activeRituals.some((ritual) => ritual.id === flow.suggestedPracticeId)).toBe(true);
    }
  });
});
