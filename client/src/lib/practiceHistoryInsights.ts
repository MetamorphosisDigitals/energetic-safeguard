export type PracticeHistoryNote = {
  id: number;
  practiceId: string;
  completedAt: Date | string;
  note: string | null;
  moodTag?: string | null;
  intentionTag?: string | null;
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function dayStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
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
  return {
    total: days.reduce((sum, day) => sum + day.total, 0),
    activeDays: days.filter((day) => day.total > 0).length,
    days,
  };
}

export function summarizePracticeMonth(entries: readonly PracticeHistoryNote[], referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const monthEntries = entries.filter((entry) => {
    const completed = asDate(entry.completedAt);
    return completed.getFullYear() === year && completed.getMonth() === month;
  });
  const practiceCount = new Set(monthEntries.map((entry) => entry.practiceId)).size;
  const activeDays = new Set(monthEntries.map((entry) => dayStart(asDate(entry.completedAt)).getTime())).size;
  return { total: monthEntries.length, activeDays, practiceCount };
}
