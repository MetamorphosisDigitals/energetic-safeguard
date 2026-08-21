import { describe, expect, it } from "vitest";
import { buildDailyHygienePlanPrintHtml } from "./dailyHygienePlanExport";

describe("daily hygiene plan export", () => {
  it("creates a printable summary with ritual, private notes, and an escaped reflection", () => {
    const html = buildDailyHygienePlanPrintHtml({
      ritualName: "Transition Pause",
      plan: { id: "daily-plan-1", archivedAt: "2026-08-20T12:00:00.000Z", startedAt: "2026-08-14T09:00:00.000Z", endsAt: "2026-08-21T09:00:00.000Z", lastPromptDate: "2026-08-20", completedDayKeys: ["2026-08-14", "2026-08-20"], selectedPracticeId: "transition-pause", completionNotes: { "2026-08-20": "A quieter finish." }, reflectionNote: "I can keep <what helped>.", },
    });
    expect(html).toContain("Transition Pause");
    expect(html).toContain("A quieter finish.");
    expect(html).toContain("I can keep &lt;what helped&gt;.");
  });
});
