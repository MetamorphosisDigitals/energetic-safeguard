import { describe, expect, it } from "vitest";
import { filterSavedPractices } from "./libraryFilters";

const favorites = [
  { id: 1, practiceId: "golden-day-boundary" },
  { id: 2, practiceId: "emerald-rose-grounding" },
  { id: 3, practiceId: "black-rose-protection" },
];

describe("Saved Support filters", () => {
  it("filters saved meditations by pathway", () => {
    const results = filterSavedPractices(favorites, { pathway: "protect", roseRayId: "all" });
    expect(results.map((item) => item.practice.id)).toEqual(["golden-day-boundary", "black-rose-protection"]);
  });

  it("filters saved meditations by Rose Ray", () => {
    const results = filterSavedPractices(favorites, { pathway: "all", roseRayId: "emerald-rose" });
    expect(results.map((item) => item.practice.id)).toEqual(["emerald-rose-grounding"]);
  });
});
