import { describe, expect, it } from "vitest";
import { filterSavedPractices } from "./libraryFilters";

const favorites = [
  { id: 1, practiceId: "golden-day-boundary" },
  { id: 2, practiceId: "emerald-rose-grounding" },
  { id: 3, practiceId: "black-rose-protection" },
];

describe("Saved Support filters", () => {
  it("filters saved meditations by pathway", () => {
    const results = filterSavedPractices(favorites, { pathway: "protect", roseRayId: "all", keyword: "" });
    expect(results.map((item) => item.practice.id)).toEqual(["golden-day-boundary", "black-rose-protection"]);
  });

  it("filters saved meditations by Rose Ray", () => {
    const results = filterSavedPractices(favorites, { pathway: "all", roseRayId: "emerald-rose", keyword: "" });
    expect(results.map((item) => item.practice.id)).toEqual(["emerald-rose-grounding"]);
  });

  it("matches a keyword against structured catalog practice metadata", () => {
    const results = filterSavedPractices(favorites, { pathway: "all", roseRayId: "all", keyword: "privacy" });
    expect(results.map((item) => item.practice.id)).toEqual(["black-rose-protection"]);
  });

  it("keeps canonical energy-hygiene rituals searchable in Saved Support", () => {
    const results = filterSavedPractices([{ id: 4, practiceId: "transition-pause" }], { pathway: "hygiene", roseRayId: "all", keyword: "call" });
    expect(results.map((item) => item.practice.displayName)).toEqual(["Transition Pause"]);
  });
});
