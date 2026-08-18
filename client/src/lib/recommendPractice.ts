/**
 * Design: Soft Sovereignty — deterministic, transparent selection respects the user's
 * stated access needs and provides one steady next step instead of an endless library.
 */
import { practices, type FlowCategory, type Location, type Practice, type PracticeStyle } from "@/data/practices";

export interface PracticeQuery {
  pathway: FlowCategory;
  situation: string;
  intensity: number;
  energy: "low" | "steady" | "high";
  availableMinutes: number;
  location: Location;
  style: PracticeStyle | "either" | "choose";
  adjustments: string[];
}

function isStyleCompatible(practice: Practice, preference: PracticeQuery["style"]) {
  if (preference === "either" || preference === "choose") return true;
  return practice.practiceStyles.includes(preference);
}

function conflictsWithAdjustments(practice: Practice, adjustments: string[]) {
  const modality = practice.preferredModality.join(" ");
  if (adjustments.includes("avoid-breath") && modality.includes("breath")) return true;
  if (adjustments.includes("avoid-visualization") && modality.includes("visualization")) return true;
  if (adjustments.includes("minimal-movement") && modality.includes("movement")) return true;
  if (adjustments.includes("keep-eyes-open") && !practice.accessibilityTags.includes("eyes-open")) return true;
  if (adjustments.includes("discreet") && practice.requiredPrivacyLevel !== "discreet") return true;
  return false;
}

function scorePractice(practice: Practice, query: PracticeQuery) {
  let score = practice.flowCategory.includes(query.pathway) ? 60 : 0;
  if (practice.suitableLocations.includes(query.location) || practice.suitableLocations.includes("anywhere")) score += 12;
  if (query.intensity >= practice.intensityRange[0] && query.intensity <= practice.intensityRange[1]) score += 18;
  score += Math.max(0, 12 - Math.abs(query.availableMinutes - practice.durationMinutes) * 3);
  if (query.energy === "low" && practice.keywords.some((word) => ["tired", "low", "depleted", "rest"].includes(word))) score += 12;
  const situation = query.situation.toLowerCase();
  score += practice.keywords.reduce((sum, keyword) => sum + (situation.includes(keyword) ? 8 : 0), 0);
  if (query.style !== "choose" && query.style !== "either" && practice.practiceStyles.includes(query.style)) score += 10;
  if (query.style === "choose" && practice.practiceStyles.includes("practical")) score += 4;
  return score;
}

export function recommendPractice(query: PracticeQuery): Practice {
  const compatible = practices.filter(
    (practice) =>
      practice.active &&
      practice.durationMinutes <= query.availableMinutes &&
      isStyleCompatible(practice, query.style) &&
      !conflictsWithAdjustments(practice, query.adjustments),
  );

  const scoped = compatible.filter((practice) => practice.flowCategory.includes(query.pathway));
  const candidates = scoped.length ? scoped : compatible;
  const fallback = practices.find((practice) => practice.id === "one-minute-emergency-reset")!;

  return candidates.reduce<Practice | null>((best, practice) => {
    if (!best || scorePractice(practice, query) > scorePractice(best, query)) return practice;
    return best;
  }, null) ?? fallback;
}

export function recommendationReason(practice: Practice, query: PracticeQuery) {
  const details: string[] = [];
  if (practice.flowCategory.includes(query.pathway)) details.push("it fits the kind of support you chose");
  if (practice.durationMinutes <= query.availableMinutes) details.push(`it fits within your ${query.availableMinutes}-minute window`);
  if (query.adjustments.length) details.push("it respects the adjustments you selected");
  return `This was selected because ${details.slice(0, 2).join(" and ") || "it offers one gentle next step"}.`;
}

