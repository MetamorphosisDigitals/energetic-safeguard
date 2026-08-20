import { describe, expect, it } from "vitest";
import { energyHygieneMoments, getFlow, practiceStyleOptions, supportFlows } from "./catalog";
import { canonicalRituals } from "./canonicalRituals";
import { practices } from "./practices";

describe("support catalog", () => {
  it("provides five data-driven dashboard pathways and all five practice styles", () => {
    expect(supportFlows.filter((flow) => flow.showOnDashboard)).toHaveLength(5);
    expect(practiceStyleOptions).toHaveLength(5);
    expect(supportFlows.every((flow) => flow.intake.options.length > 0)).toBe(true);
  });

  it("links the always-available quick reset to a library practice", () => {
    const emergencyFlow = getFlow("emergency");
    expect(emergencyFlow?.suggestedPracticeId).toBeDefined();
    expect(practices.some((practice) => practice.id === emergencyFlow?.suggestedPracticeId)).toBe(true);
  });

  it("links restoration and daily hygiene moments to distinct canonical rituals", () => {
    expect(energyHygieneMoments.map((moment) => moment.id)).toEqual(["after-interaction", "daily-hygiene"]);
    expect(energyHygieneMoments.every((moment) => canonicalRituals.some((ritual) => ritual.id === moment.suggestedPracticeId))).toBe(true);
    expect(new Set(energyHygieneMoments.map((moment) => moment.suggestedPracticeId)).size).toBe(2);
  });
});
