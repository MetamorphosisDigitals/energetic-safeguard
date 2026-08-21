/**
 * Design: Soft Sovereignty — persistence is intentionally local, private, and fail-safe.
 * It remembers only in-browser preferences, free-practice usage, and seven-day intentions.
 */
import type { PracticeStyle } from "@/data/practices";

export type StoredPracticeStyle = PracticeStyle | "either" | "choose";
export type StoredTextSize = "standard" | "large";
export type EnergyHygieneShortcutId = "after-interaction" | "daily-hygiene";
export interface UserPreferences { practiceStyle: StoredPracticeStyle; reducedMotion: boolean; textSize: StoredTextSize; energyHygieneShortcutIds: EnergyHygieneShortcutId[]; }
export interface SevenDayCommitment { practiceId: string; practiceName: string; startedAt: string; endsAt: string; }
export interface DailyHygieneReminder { startedAt: string; endsAt: string; lastPromptDate: string | null; completedDayKeys: string[]; selectedPracticeId: string; completionNotes: Record<string, string>; reflectionNote: string; }
export interface DailyHygienePlanProgress { currentDay: number; completedDays: number[]; completedCount: number; }
export interface ArchivedDailyHygienePlan extends DailyHygieneReminder { id: string; archivedAt: string; }
export type DailyRoutineSlot = "morning" | "protection" | "evening";
export interface DailyRoutine { selectedPracticeIds: Record<DailyRoutineSlot, string | null>; openedDayCount: number; lastOpenedDate: string | null; lastCelebratedMilestone: 7 | 14 | 21 | null; }
export interface DailyRoutineOpening { routine: DailyRoutine; milestone: 7 | 14 | 21 | null; }
export interface FreePracticeUsage { completedCount: number; }

const PREFERENCES_KEY = "energetic-safeguard:preferences:v1";
const COMMITMENT_KEY = "energetic-safeguard:seven-day-commitment:v1";
const FREE_USAGE_KEY = "energetic-safeguard:free-practice-usage:v1";
const ONBOARDING_KEY = "energetic-safeguard:onboarding-complete:v1";
const DAILY_HYGIENE_REMINDER_KEY = "energetic-safeguard:daily-hygiene-reminder:v1";
const DAILY_HYGIENE_ARCHIVE_KEY = "energetic-safeguard:daily-hygiene-archive:v1";
const DAILY_ROUTINE_KEY = "energetic-safeguard:daily-routine:v1";
const validStyles: StoredPracticeStyle[] = ["practical", "rose", "rose-crystal", "either", "choose"];
const validEnergyHygieneShortcutIds: EnergyHygieneShortcutId[] = ["after-interaction", "daily-hygiene"];
const defaults: UserPreferences = { practiceStyle: "choose", reducedMotion: false, textSize: "standard", energyHygieneShortcutIds: [] };

function getStorage() { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } }
function readJson(key: string): unknown { try { const value = getStorage()?.getItem(key); return value ? JSON.parse(value) : null; } catch { return null; } }
function writeJson(key: string, value: unknown) { try { getStorage()?.setItem(key, JSON.stringify(value)); } catch { /* local storage may be blocked */ } }

export function loadPreferences(): UserPreferences {
  const stored = readJson(PREFERENCES_KEY) as Partial<UserPreferences> | null;
  return {
    practiceStyle: stored && validStyles.includes(stored.practiceStyle as StoredPracticeStyle) ? stored.practiceStyle as StoredPracticeStyle : defaults.practiceStyle,
    reducedMotion: typeof stored?.reducedMotion === "boolean" ? stored.reducedMotion : defaults.reducedMotion,
    textSize: stored?.textSize === "large" || stored?.textSize === "standard" ? stored.textSize : defaults.textSize,
    energyHygieneShortcutIds: Array.isArray(stored?.energyHygieneShortcutIds) ? Array.from(new Set(stored.energyHygieneShortcutIds.filter((id): id is EnergyHygieneShortcutId => validEnergyHygieneShortcutIds.includes(id as EnergyHygieneShortcutId)))) : defaults.energyHygieneShortcutIds,
  };
}
export function savePreferences(preferences: UserPreferences) { writeJson(PREFERENCES_KEY, preferences); }
export function reorderEnergyHygieneShortcuts(ids: readonly EnergyHygieneShortcutId[], sourceId: EnergyHygieneShortcutId, targetId: EnergyHygieneShortcutId) { const ordered = Array.from(new Set(ids)); const sourceIndex = ordered.indexOf(sourceId); const targetIndex = ordered.indexOf(targetId); if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return ordered; const [source] = ordered.splice(sourceIndex, 1); ordered.splice(targetIndex, 0, source); return ordered; }

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

function todayKey(date = new Date()) { return date.toISOString().slice(0, 10); }
const routineSlots: DailyRoutineSlot[] = ["morning", "protection", "evening"];
const emptyDailyRoutine = (): DailyRoutine => ({ selectedPracticeIds: { morning: null, protection: null, evening: null }, openedDayCount: 0, lastOpenedDate: null, lastCelebratedMilestone: null });
export function loadDailyRoutine(): DailyRoutine { const stored = readJson(DAILY_ROUTINE_KEY) as Partial<DailyRoutine> | null; if (!stored || !stored.selectedPracticeIds || typeof stored.selectedPracticeIds !== "object") return emptyDailyRoutine(); const selectedPracticeIds = Object.fromEntries(routineSlots.map((slot) => [slot, typeof stored.selectedPracticeIds?.[slot] === "string" && stored.selectedPracticeIds[slot] ? stored.selectedPracticeIds[slot] : null])) as Record<DailyRoutineSlot, string | null>; const openedDayCount = typeof stored.openedDayCount === "number" && Number.isInteger(stored.openedDayCount) ? Math.max(0, Math.min(21, stored.openedDayCount)) : 0; const lastOpenedDate = typeof stored.lastOpenedDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(stored.lastOpenedDate) ? stored.lastOpenedDate : null; const lastCelebratedMilestone = stored.lastCelebratedMilestone === 7 || stored.lastCelebratedMilestone === 14 || stored.lastCelebratedMilestone === 21 ? stored.lastCelebratedMilestone : null; return { selectedPracticeIds, openedDayCount, lastOpenedDate, lastCelebratedMilestone }; }
export function saveDailyRoutine(routine: DailyRoutine) { writeJson(DAILY_ROUTINE_KEY, routine); }
export function createDailyRoutine() { return emptyDailyRoutine(); }
export function setDailyRoutineRitual(routine: DailyRoutine, slot: DailyRoutineSlot, practiceId: string | null): DailyRoutine { return { ...routine, selectedPracticeIds: { ...routine.selectedPracticeIds, [slot]: practiceId } }; }
export function recordDailyRoutineOpening(routine: DailyRoutine, now = new Date()): DailyRoutineOpening { const currentDate = todayKey(now); if (routine.lastOpenedDate === currentDate) return { routine, milestone: null }; const previousDate = routine.lastOpenedDate ? Date.parse(`${routine.lastOpenedDate}T00:00:00.000Z`) : NaN; const currentTimestamp = Date.parse(`${currentDate}T00:00:00.000Z`); const dayGap = Number.isNaN(previousDate) ? null : Math.round((currentTimestamp - previousDate) / 86_400_000); const openedDayCount = dayGap === 1 ? Math.min(21, routine.openedDayCount + 1) : 1; const candidate = openedDayCount === 7 || openedDayCount === 14 || openedDayCount === 21 ? openedDayCount : null; const milestone = candidate && routine.lastCelebratedMilestone !== candidate ? candidate : null; return { routine: { ...routine, openedDayCount, lastOpenedDate: currentDate, lastCelebratedMilestone: milestone ?? routine.lastCelebratedMilestone }, milestone }; }
export function loadDailyHygieneReminder(): DailyHygieneReminder | null {
  const stored = readJson(DAILY_HYGIENE_REMINDER_KEY) as Partial<DailyHygieneReminder> | null;
  const startedAt = stored?.startedAt;
  const storedEndsAt = stored?.endsAt;
  const endsAt = typeof storedEndsAt === "string" ? Date.parse(storedEndsAt) : NaN;
  if (!stored || typeof startedAt !== "string" || typeof storedEndsAt !== "string" || Number.isNaN(endsAt) || endsAt <= Date.now() || (stored.lastPromptDate !== null && typeof stored.lastPromptDate !== "string")) { clearDailyHygieneReminder(); return null; }
  const completedDayKeys = Array.isArray(stored.completedDayKeys) ? Array.from(new Set(stored.completedDayKeys.filter((value): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)))) : [];
  const completionNotes = stored.completionNotes && typeof stored.completionNotes === "object" && !Array.isArray(stored.completionNotes)
    ? Object.fromEntries(Object.entries(stored.completionNotes).flatMap(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === "string" && value.trim() ? [[key, value.trim().slice(0, 1000)]] : []))
    : {};
  return { startedAt, endsAt: storedEndsAt, lastPromptDate: stored.lastPromptDate ?? null, completedDayKeys, selectedPracticeId: typeof stored.selectedPracticeId === "string" && stored.selectedPracticeId ? stored.selectedPracticeId : "energy-conservation-pause", completionNotes, reflectionNote: typeof stored.reflectionNote === "string" ? stored.reflectionNote.slice(0, 1200) : "" };
}
export function createDailyHygieneReminder(selectedPracticeId = "energy-conservation-pause"): DailyHygieneReminder { const started = new Date(); const ends = new Date(started); ends.setDate(ends.getDate() + 7); return { startedAt: started.toISOString(), endsAt: ends.toISOString(), lastPromptDate: null, completedDayKeys: [], selectedPracticeId, completionNotes: {}, reflectionNote: "" }; }
export function saveDailyHygieneReminder(reminder: DailyHygieneReminder) { writeJson(DAILY_HYGIENE_REMINDER_KEY, reminder); }
export function clearDailyHygieneReminder() { try { getStorage()?.removeItem(DAILY_HYGIENE_REMINDER_KEY); } catch { /* local storage may be blocked */ } }
export function isDailyHygieneReminderDue(reminder: DailyHygieneReminder) { return reminder.lastPromptDate !== todayKey(); }
export function dismissDailyHygieneReminderForToday(reminder: DailyHygieneReminder): DailyHygieneReminder { return { ...reminder, lastPromptDate: todayKey() }; }
export function remainingDailyHygieneReminderDays(reminder: DailyHygieneReminder) { return Math.max(1, Math.ceil((Date.parse(reminder.endsAt) - Date.now()) / 86_400_000)); }
export function getDailyHygienePlanProgress(reminder: DailyHygieneReminder, now = new Date()): DailyHygienePlanProgress { const start = Date.parse(reminder.startedAt); const startCalendarDay = Date.parse(`${reminder.startedAt.slice(0, 10)}T00:00:00.000Z`); const currentDay = Math.min(7, Math.max(1, Math.floor((now.getTime() - start) / 86_400_000) + 1)); const completedDays = reminder.completedDayKeys.flatMap((key) => { const day = Math.floor((Date.parse(`${key}T00:00:00.000Z`) - startCalendarDay) / 86_400_000) + 1; return day >= 1 && day <= 7 ? [day] : []; }); const uniqueCompletedDays = Array.from(new Set(completedDays)).sort((left, right) => left - right); return { currentDay, completedDays: uniqueCompletedDays, completedCount: uniqueCompletedDays.length }; }
export function hasCompletedDailyHygienePlan(reminder: DailyHygieneReminder, now = new Date()) { const progress = getDailyHygienePlanProgress(reminder, now); return progress.currentDay === 7 && progress.completedDays.includes(7); }
export function duplicateDailyHygienePlan(reminder: DailyHygieneReminder) { return createDailyHygieneReminder(reminder.selectedPracticeId); }
export function completeDailyHygieneForToday(reminder: DailyHygieneReminder): DailyHygieneReminder { const key = todayKey(); return { ...reminder, lastPromptDate: key, completedDayKeys: reminder.completedDayKeys.includes(key) ? reminder.completedDayKeys : [...reminder.completedDayKeys, key] }; }
export function setDailyHygieneNoteForToday(reminder: DailyHygieneReminder, note: string, date = new Date()): DailyHygieneReminder { const key = todayKey(date); const normalized = note.trim().slice(0, 1000); const completionNotes = { ...reminder.completionNotes }; if (normalized) completionNotes[key] = normalized; else delete completionNotes[key]; return { ...reminder, completionNotes }; }
export function setDailyHygieneReflection(reminder: DailyHygieneReminder, note: string): DailyHygieneReminder { return { ...reminder, reflectionNote: note.trim().slice(0, 1200) }; }
export function loadArchivedDailyHygienePlans(): ArchivedDailyHygienePlan[] { const stored = readJson(DAILY_HYGIENE_ARCHIVE_KEY); if (!Array.isArray(stored)) return []; return stored.flatMap((value) => { if (!value || typeof value !== "object") return []; const plan = value as Partial<ArchivedDailyHygienePlan>; if (typeof plan.id !== "string" || typeof plan.archivedAt !== "string" || typeof plan.startedAt !== "string" || typeof plan.endsAt !== "string" || typeof plan.selectedPracticeId !== "string" || !Array.isArray(plan.completedDayKeys)) return []; const completionNotes = plan.completionNotes && typeof plan.completionNotes === "object" && !Array.isArray(plan.completionNotes) ? Object.fromEntries(Object.entries(plan.completionNotes).flatMap(([key, note]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && typeof note === "string" && note.trim() ? [[key, note.trim().slice(0, 1000)]] : [])) : {}; return [{ id: plan.id, archivedAt: plan.archivedAt, startedAt: plan.startedAt, endsAt: plan.endsAt, lastPromptDate: typeof plan.lastPromptDate === "string" ? plan.lastPromptDate : null, completedDayKeys: Array.from(new Set(plan.completedDayKeys.filter((key): key is string => typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key)))), selectedPracticeId: plan.selectedPracticeId, completionNotes, reflectionNote: typeof plan.reflectionNote === "string" ? plan.reflectionNote.slice(0, 1200) : "" }]; }).sort((left, right) => Date.parse(right.archivedAt) - Date.parse(left.archivedAt)).slice(0, 30); }
export function archiveDailyHygienePlan(reminder: DailyHygieneReminder, archivedAt = new Date()): ArchivedDailyHygienePlan[] { const entry: ArchivedDailyHygienePlan = { ...reminder, id: `daily-plan-${reminder.startedAt}`, archivedAt: archivedAt.toISOString() }; const next = [entry, ...loadArchivedDailyHygienePlans().filter((plan) => plan.id !== entry.id)].slice(0, 30); writeJson(DAILY_HYGIENE_ARCHIVE_KEY, next); return next; }

export function loadFreePracticeUsage(): FreePracticeUsage {
  const stored = readJson(FREE_USAGE_KEY) as Partial<FreePracticeUsage> | null;
  const count = stored?.completedCount;
  return { completedCount: typeof count === "number" && Number.isInteger(count) && count >= 0 ? Math.min(count, 3) : 0 };
}
export function recordCompletedFreePractice(usage: FreePracticeUsage): FreePracticeUsage { const next = { completedCount: Math.min(usage.completedCount + 1, 3) }; writeJson(FREE_USAGE_KEY, next); return next; }
export function hasCompletedOnboarding() { return readJson(ONBOARDING_KEY) === true; }
export function saveOnboardingCompleted() { writeJson(ONBOARDING_KEY, true); }
