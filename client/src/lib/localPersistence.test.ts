import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSevenDayCommitment, hasCompletedOnboarding, loadFreePracticeUsage, loadPreferences,
  loadSevenDayCommitment, recordCompletedFreePractice, saveOnboardingCompleted,
  savePreferences, saveSevenDayCommitment,
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
    savePreferences({ practiceStyle: "rose", reducedMotion: true, textSize: "large" });
    expect(loadPreferences()).toEqual({ practiceStyle: "rose", reducedMotion: true, textSize: "large" });
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
});
