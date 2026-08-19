import { describe, expect, it } from "vitest";
import { comparePracticeMonths, filterPracticeHistoryByCustomTag, filterPracticeHistoryNotes, summarizePracticeMonth, summarizePracticeWeek, summarizeThreeMonthTrend } from "./practiceHistoryInsights";

const entries = [
  { id: 1, practiceId: "a", completedAt: new Date(2026, 7, 10, 10), note: "Felt calmer after the boundary practice." },
  { id: 2, practiceId: "b", completedAt: new Date(2026, 7, 13, 12), note: "A gentle reset." },
  { id: 3, practiceId: "c", completedAt: new Date(2026, 7, 13, 18), note: null },
];

describe("practice history insights", () => {
  it("filters notes by keyword and inclusive date range", () => {
    expect(filterPracticeHistoryNotes(entries, "reset", "2026-08-12", "2026-08-13").map((entry) => entry.id)).toEqual([2]);
  });

  it("summarizes the preceding seven calendar days", () => {
    const summary = summarizePracticeWeek(entries, new Date(2026, 7, 14));
    expect(summary.total).toBe(3);
    expect(summary.activeDays).toBe(2);
    expect(summary.days.at(-2)?.total).toBe(2);
  });

  it("summarizes the current calendar month", () => {
    const summary = summarizePracticeMonth(entries, new Date(2026, 7, 14));
    expect(summary).toEqual({ total: 3, activeDays: 2, practiceCount: 3 });
  });

  it("compares the current month with the previous month", () => {
    const withPrevious = [...entries, { id: 4, practiceId: "d", completedAt: new Date(2026, 6, 22), note: null }];
    const comparison = comparePracticeMonths(withPrevious, new Date(2026, 7, 14));
    expect(comparison.totalDifference).toBe(2);
    expect(comparison.activeDayDifference).toBe(1);
  });

  it("builds a three-month trend in chronological order", () => {
    const trend = summarizeThreeMonthTrend([...entries, { id: 5, practiceId: "x", completedAt: new Date(2026, 5, 9), note: null }], new Date(2026, 7, 14));
    expect(trend.map((month) => month.total)).toEqual([1, 0, 3]);
  });

  it("filters reflections by a custom tag without case sensitivity", () => {
    const tagged = [{ ...entries[0], customTags: '["Workday"]' }, entries[1]];
    expect(filterPracticeHistoryByCustomTag(tagged, "workday").map((entry) => entry.id)).toEqual([1]);
  });
});
