import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  completeDailyHygieneForToday, createDailyHygieneReminder, createSevenDayCommitment, dismissDailyHygieneReminderForToday, duplicateDailyHygienePlan,
  getDailyHygienePlanProgress,
  hasCompletedDailyHygienePlan, hasCompletedOnboarding, isDailyHygieneReminderDue, loadDailyHygieneReminder, loadFreePracticeUsage,
  loadPreferences, loadSevenDayCommitment, recordCompletedFreePractice, reorderEnergyHygieneShortcuts, saveDailyHygieneReminder,
  saveOnboardingCompleted, savePreferences, saveSevenDayCommitment, setDailyHygieneNoteForToday, setDailyHygieneReflection,
} from "./localPersistence";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: createMemoryStorage() } });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
});

describe("local persistence", () => {
  it("restores saved style and accessibility preferences after a new read", () => {
    savePreferences({ practiceStyle: "rose", reducedMotion: true, textSize: "large", energyHygieneShortcutIds: ["daily-hygiene", "after-interaction"] });
    expect(loadPreferences()).toEqual({ practiceStyle: "rose", reducedMotion: true, textSize: "large", energyHygieneShortcutIds: ["daily-hygiene", "after-interaction"] });
  });

  it("reorders saved energy-hygiene shortcuts without changing which shortcuts are stored", () => {
    expect(reorderEnergyHygieneShortcuts(["after-interaction", "daily-hygiene"], "daily-hygiene", "after-interaction")).toEqual(["daily-hygiene", "after-interaction"]);
  });

  it("restores an active seven-day commitment and caps persisted free usage at three", () => {
    const commitment = createSevenDayCommitment("emerald-rose-grounding", "Emerald Rose Grounding");
    saveSevenDayCommitment(commitment);
    expect(loadSevenDayCommitment()).toEqual(commitment);
    expect(recordCompletedFreePractice({ completedCount: 2 })).toEqual({ completedCount: 3 });
    expect(recordCompletedFreePractice({ completedCount: 3 })).toEqual({ completedCount: 3 });
    expect(loadFreePracticeUsage()).toEqual({ completedCount: 3 });
  });

  it("restores onboarding completion on later app loads", () => {
    expect(hasCompletedOnboarding()).toBe(false);
    saveOnboardingCompleted();
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it("stores a private seven-day daily-hygiene reminder and dismisses it for the current day", () => {
    const reminder = createDailyHygieneReminder();
    saveDailyHygieneReminder(reminder);
    expect(loadDailyHygieneReminder()).toEqual(reminder);
    expect(isDailyHygieneReminderDue(reminder)).toBe(true);
    expect(isDailyHygieneReminderDue(dismissDailyHygieneReminderForToday(reminder))).toBe(false);
  });

  it("tracks a completed daily-hygiene practice once and renders its seven-day position", () => {
    const reminder = { startedAt: "2026-08-20T09:00:00.000Z", endsAt: "2026-08-27T09:00:00.000Z", lastPromptDate: null, completedDayKeys: ["2026-08-20"], selectedPracticeId: "energy-conservation-pause", completionNotes: {}, reflectionNote: "" };
    const progress = getDailyHygienePlanProgress(reminder, new Date("2026-08-22T12:00:00.000Z"));
    expect(progress).toEqual({ currentDay: 3, completedDays: [1], completedCount: 1 });
    const completedToday = completeDailyHygieneForToday({ ...reminder, completedDayKeys: [] });
    expect(completedToday.completedDayKeys).toHaveLength(1);
    expect(completeDailyHygieneForToday(completedToday).completedDayKeys).toHaveLength(1);
  });

  it("keeps the selected ritual, optional day note, and final reflection private to the local daily plan", () => {
    const plan = createDailyHygieneReminder("transition-pause");
    const noted = setDailyHygieneNoteForToday(plan, "I paused before my next task.", new Date("2026-08-20T12:00:00.000Z"));
    const reflected = setDailyHygieneReflection(noted, "A smaller pace supported me this week.");
    expect(reflected.selectedPracticeId).toBe("transition-pause");
    expect(reflected.completionNotes["2026-08-20"]).toBe("I paused before my next task.");
    expect(reflected.reflectionNote).toBe("A smaller pace supported me this week.");
  });

  it("recognizes a completed Day 7 plan and duplicates only its selected ritual into a fresh cycle", () => {
    const completed = {
      startedAt: "2026-08-14T09:00:00.000Z", endsAt: "2026-08-21T09:00:00.000Z", lastPromptDate: "2026-08-20",
      completedDayKeys: ["2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20"],
      selectedPracticeId: "transition-pause", completionNotes: { "2026-08-14": "A quiet beginning." }, reflectionNote: "I can keep my pace gentle.",
    };
    expect(hasCompletedDailyHygienePlan(completed, new Date("2026-08-20T12:00:00.000Z"))).toBe(true);
    const duplicate = duplicateDailyHygienePlan(completed);
    expect(duplicate).toMatchObject({ selectedPracticeId: "transition-pause", completedDayKeys: [], completionNotes: {}, reflectionNote: "", lastPromptDate: null });
  });
});
