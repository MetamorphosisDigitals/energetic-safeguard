export type PracticeHistoryNote = {
  id: number;
  practiceId: string;
  completedAt: Date | string;
  note: string | null;
  moodTag?: string | null;
  intentionTag?: string | null;
  customTags?: string | null;
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function dayStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseCustomTags(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch { return []; }
}

export function filterPracticeHistoryNotes(entries: readonly PracticeHistoryNote[], keyword: string, startDate?: string, endDate?: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
  return entries.filter((entry) => {
    const completed = asDate(entry.completedAt);
    if (start && completed < start) return false;
    if (end && completed > end) return false;
    return !normalizedKeyword || (entry.note ?? "").toLowerCase().includes(normalizedKeyword);
  });
}

export function filterPracticeHistoryByCustomTag(entries: readonly PracticeHistoryNote[], tag: string | "all") {
  if (tag === "all") return [...entries];
  const normalized = tag.toLocaleLowerCase();
  return entries.filter((entry) => parseCustomTags(entry.customTags).some((entryTag) => entryTag.toLocaleLowerCase() === normalized));
}

export function summarizePracticeWeek(entries: readonly PracticeHistoryNote[], referenceDate = new Date()) {
  const today = dayStart(referenceDate);
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    return { date, total: 0 };
  });
  for (const entry of entries) {
    const completed = dayStart(asDate(entry.completedAt));
    const matchingDay = days.find((day) => day.date.getTime() === completed.getTime());
    if (matchingDay) matchingDay.total += 1;
  }
  return { total: days.reduce((sum, day) => sum + day.total, 0), activeDays: days.filter((day) => day.total > 0).length, days };
}

export function summarizePracticeMonth(entries: readonly PracticeHistoryNote[], referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const monthEntries = entries.filter((entry) => {
    const completed = asDate(entry.completedAt);
    return completed.getFullYear() === year && completed.getMonth() === month;
  });
  return { total: monthEntries.length, activeDays: new Set(monthEntries.map((entry) => dayStart(asDate(entry.completedAt)).getTime())).size, practiceCount: new Set(monthEntries.map((entry) => entry.practiceId)).size };
}

export function comparePracticeMonths(entries: readonly PracticeHistoryNote[], referenceDate = new Date()) {
  const current = summarizePracticeMonth(entries, referenceDate);
  const previous = summarizePracticeMonth(entries, new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1));
  return { current, previous, totalDifference: current.total - previous.total, activeDayDifference: current.activeDays - previous.activeDays };
}

export function summarizeThreeMonthTrend(entries: readonly PracticeHistoryNote[], referenceDate = new Date()) {
  return [2, 1, 0].map((offset) => {
    const reference = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - offset, 1);
    return { label: reference.toLocaleDateString(undefined, { month: "short" }), ...summarizePracticeMonth(entries, reference) };
  });
}
