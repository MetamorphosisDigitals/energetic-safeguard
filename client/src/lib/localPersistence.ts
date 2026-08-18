/**
 * Design: Soft Sovereignty — persistence is intentionally local, private, and fail-safe.
 * It remembers only in-browser preferences, free-practice usage, and seven-day intentions.
 */
import type { PracticeStyle } from "@/data/practices";

export type StoredPracticeStyle = PracticeStyle | "either" | "choose";
export type StoredTextSize = "standard" | "large";
export interface UserPreferences { practiceStyle: StoredPracticeStyle; reducedMotion: boolean; textSize: StoredTextSize; }
export interface SevenDayCommitment { practiceId: string; practiceName: string; startedAt: string; endsAt: string; }
export interface FreePracticeUsage { completedCount: number; }

const PREFERENCES_KEY = "energetic-safeguard:preferences:v1";
const COMMITMENT_KEY = "energetic-safeguard:seven-day-commitment:v1";
const FREE_USAGE_KEY = "energetic-safeguard:free-practice-usage:v1";
const ONBOARDING_KEY = "energetic-safeguard:onboarding-complete:v1";
const validStyles: StoredPracticeStyle[] = ["practical", "rose", "rose-crystal", "either", "choose"];
const defaults: UserPreferences = { practiceStyle: "choose", reducedMotion: false, textSize: "standard" };

function getStorage() { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } }
function readJson(key: string): unknown { try { const value = getStorage()?.getItem(key); return value ? JSON.parse(value) : null; } catch { return null; } }
function writeJson(key: string, value: unknown) { try { getStorage()?.setItem(key, JSON.stringify(value)); } catch { /* local storage may be blocked */ } }

export function loadPreferences(): UserPreferences {
  const stored = readJson(PREFERENCES_KEY) as Partial<UserPreferences> | null;
  return {
    practiceStyle: stored && validStyles.includes(stored.practiceStyle as StoredPracticeStyle) ? stored.practiceStyle as StoredPracticeStyle : defaults.practiceStyle,
    reducedMotion: typeof stored?.reducedMotion === "boolean" ? stored.reducedMotion : defaults.reducedMotion,
    textSize: stored?.textSize === "large" || stored?.textSize === "standard" ? stored.textSize : defaults.textSize,
  };
}
export function savePreferences(preferences: UserPreferences) { writeJson(PREFERENCES_KEY, preferences); }

export function loadSevenDayCommitment(): SevenDayCommitment | null {
  const stored = readJson(COMMITMENT_KEY) as Partial<SevenDayCommitment> | null;
  const endsAt = typeof stored?.endsAt === "string" ? Date.parse(stored.endsAt) : NaN;
  if (!stored || typeof stored.practiceId !== "string" || typeof stored.practiceName !== "string" || typeof stored.startedAt !== "string" || Number.isNaN(endsAt) || endsAt <= Date.now()) {
    clearSevenDayCommitment();
    return null;
  }
  return stored as SevenDayCommitment;
}
export function saveSevenDayCommitment(commitment: SevenDayCommitment) { writeJson(COMMITMENT_KEY, commitment); }
export function clearSevenDayCommitment() { try { getStorage()?.removeItem(COMMITMENT_KEY); } catch { /* no storage available */ } }
export function createSevenDayCommitment(practiceId: string, practiceName: string): SevenDayCommitment { const started = new Date(); const ends = new Date(started); ends.setDate(ends.getDate() + 7); return { practiceId, practiceName, startedAt: started.toISOString(), endsAt: ends.toISOString() }; }
export function remainingCommitmentDays(commitment: SevenDayCommitment) { return Math.max(1, Math.ceil((Date.parse(commitment.endsAt) - Date.now()) / 86_400_000)); }

export function loadFreePracticeUsage(): FreePracticeUsage {
  const stored = readJson(FREE_USAGE_KEY) as Partial<FreePracticeUsage> | null;
  const count = stored?.completedCount;
  return { completedCount: typeof count === "number" && Number.isInteger(count) && count >= 0 ? Math.min(count, 3) : 0 };
}
export function recordCompletedFreePractice(usage: FreePracticeUsage): FreePracticeUsage { const next = { completedCount: Math.min(usage.completedCount + 1, 3) }; writeJson(FREE_USAGE_KEY, next); return next; }
export function hasCompletedOnboarding() { return readJson(ONBOARDING_KEY) === true; }
export function saveOnboardingCompleted() { writeJson(ONBOARDING_KEY, true); }
