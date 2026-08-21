import { describe, expect, it } from "vitest";
import { deduplicateRoutinePlanArchiveInputs, type RoutinePlanArchiveBackupInput } from "./db";

const first: RoutinePlanArchiveBackupInput = {
  clientArchiveKey: "daily-plan-2026-08-14T09:00:00.000Z",
  selectedPracticeId: "transition-pause",
  startedAt: new Date("2026-08-14T09:00:00.000Z"),
  endsAt: new Date("2026-08-21T09:00:00.000Z"),
  archivedAt: new Date("2026-08-21T10:00:00.000Z"),
  completedDayKeys: ["2026-08-14"],
  completionNotes: {},
  reflectionNote: null,
};

describe("routine archive import preparation", () => {
  it("deduplicates a repeated browser archive key before a backup request is stored", () => {
    const updated = { ...first, reflectionNote: "Newest local version." };
    expect(deduplicateRoutinePlanArchiveInputs([first, updated])).toEqual([updated]);
  });
});
