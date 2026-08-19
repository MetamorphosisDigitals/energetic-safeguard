import { describe, expect, it } from "vitest";
import { buildMonthlyReflectionPrintHtml, buildMonthlyReflectionText } from "./monthlyReflectionExport";

const data = { monthLabel: "August 2026", total: 4, activeDays: 3, practiceTypes: 2, comparison: { totalDifference: 1, activeDayDifference: 1 }, entries: [{ id: 1, practiceId: "reset", completedAt: new Date(2026, 7, 4), note: "A calmer ending to the day." }] };

describe("monthly reflection export", () => {
  it("creates a portable text summary with metrics and private reflections", () => {
    expect(buildMonthlyReflectionText(data)).toContain("+1 practices compared with last month");
  });

  it("escapes private reflection content in the printable export", () => {
    const html = buildMonthlyReflectionPrintHtml({ ...data, entries: [{ ...data.entries[0], note: "<private>" }] });
    expect(html).toContain("&lt;private&gt;");
  });
});
