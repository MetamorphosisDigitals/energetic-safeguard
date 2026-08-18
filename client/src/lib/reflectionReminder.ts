export type ReflectionReminderPreference = {
  enabled: boolean;
  lastPromptedAt: string | null;
};

export const defaultReflectionReminderPreference: ReflectionReminderPreference = { enabled: false, lastPromptedAt: null };

export function isWeeklyReflectionDue(preference: ReflectionReminderPreference, now = new Date()) {
  if (!preference.enabled) return false;
  if (!preference.lastPromptedAt) return true;
  const lastPrompted = new Date(preference.lastPromptedAt);
  return !Number.isNaN(lastPrompted.getTime()) && now.getTime() - lastPrompted.getTime() >= 7 * 24 * 60 * 60 * 1000;
}
