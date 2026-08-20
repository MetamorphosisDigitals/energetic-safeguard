/**
 * Safety-first, deterministic selector for the canonical 18-ritual catalog.
 * This module is deliberately UI-independent: it may be called from a tRPC
 * endpoint, a client flow, or a test harness with the same result contract.
 */
export type SafetyTrigger =
  | "immediate-danger"
  | "unable-to-stay-safe"
  | "severe-physical-symptoms"
  | "severe-disorientation"
  | "self-harm-or-harm-thoughts";

export type Setting = "home" | "work" | "public" | "transit" | "outdoors" | "resting" | "screen" | "anywhere";
export type Adjustment = "keep-eyes-open" | "avoid-breath" | "avoid-visualization" | "minimal-movement" | "discreet" | "low-energy";
export type Modality = "sensory" | "breath" | "visualization" | "movement" | "intention" | "boundary" | "reflection" | "focus";

export interface RitualSafetyMetadata {
  highIntensityEligible: boolean;
  transitSafe: boolean;
  requiresExternalOrientation?: boolean;
  fallbackBehavior?: "alternative-ritual" | "safety-handoff";
}

export interface SelectableRitual {
  id: string;
  displayName: string;
  active: boolean;
  flowCategory: string[];
  intensityRange: readonly [number, number];
  durationMinutes: number;
  suitableLocations: Setting[];
  preferredModality: Modality[];
  accessibilityTags: string[];
  keywords: string[];
  safety: RitualSafetyMetadata;
}

export interface SelectionInput {
  pathway: string;
  primaryAnswerTags: string[];
  secondaryTags?: string[];
  availableMinutes: number;
  setting: Setting;
  intensity?: number;
  adjustments: Adjustment[];
  safetyTriggers?: SafetyTrigger[];
}

export type SafetyHandoff = {
  kind: "safety-handoff";
  reason: "explicit-trigger" | "very-high-intensity" | "no-safe-ritual";
  priority: "urgent" | "high";
  orientationSteps: string[];
  supportMessage: string;
};

export type RitualRecommendation = {
  kind: "ritual";
  ritual: SelectableRitual;
  score: number;
  appliedSafetyProfile: "standard" | "high-intensity" | "transit-safe";
  reason: string;
};

export type SelectionResult = SafetyHandoff | RitualRecommendation;

const IMMEDIATE_HANDOFF_STEPS = [
  "If you can, stop the current practice and keep your eyes open.",
  "Notice where you are and one stable surface supporting you.",
  "Move toward immediate safety or a trusted person when possible.",
  "Seek appropriate emergency, medical, mental-health, crisis, or trusted-person support for what is happening.",
];

const VERY_HIGH_INTENSITY_STEPS = [
  "Keep your eyes open and feel the surface beneath you.",
  "Name where you are and notice three ordinary objects.",
  "Let breathing remain natural; do not force it.",
  "Consider reaching out to a trusted person or appropriate professional support if the intensity remains very high.",
];

function handoff(reason: SafetyHandoff["reason"]): SafetyHandoff {
  const urgent = reason === "explicit-trigger";
  return {
    kind: "safety-handoff",
    reason,
    priority: urgent ? "urgent" : "high",
    orientationSteps: urgent ? IMMEDIATE_HANDOFF_STEPS : VERY_HIGH_INTENSITY_STEPS,
    supportMessage: urgent
      ? "This moment may need more than a ritual. You deserve immediate, practical support and safety."
      : "This feels very intense right now. You do not need to complete a full ritual or force yourself to calm down.",
  };
}

function hasForbiddenModality(ritual: SelectableRitual, adjustments: Adjustment[]) {
  const modalities = new Set(ritual.preferredModality);
  return (
    (adjustments.includes("avoid-breath") && modalities.has("breath")) ||
    (adjustments.includes("avoid-visualization") && modalities.has("visualization")) ||
    (adjustments.includes("minimal-movement") && modalities.has("movement")) ||
    (adjustments.includes("keep-eyes-open") && !ritual.accessibilityTags.includes("eyes-open")) ||
    (adjustments.includes("discreet") && !ritual.accessibilityTags.includes("discreet"))
  );
}

function safetyEligible(ritual: SelectableRitual, input: SelectionInput) {
  const intensity = input.intensity ?? 4;
  if (!ritual.active || intensity < ritual.intensityRange[0] || intensity > ritual.intensityRange[1]) return false;
  if (ritual.durationMinutes > input.availableMinutes || hasForbiddenModality(ritual, input.adjustments)) return false;
  if (!ritual.suitableLocations.includes("anywhere") && !ritual.suitableLocations.includes(input.setting)) return false;

  if (input.setting === "transit" && !ritual.safety.transitSafe) return false;
  if (intensity >= 7 && (!ritual.safety.highIntensityEligible || !ritual.accessibilityTags.includes("eyes-open") || !ritual.safety.requiresExternalOrientation)) return false;
  return true;
}

function score(ritual: SelectableRitual, input: SelectionInput) {
  const tags = [...input.primaryAnswerTags, ...(input.secondaryTags ?? [])].map((tag) => tag.toLocaleLowerCase());
  const keywords = ritual.keywords.map((keyword) => keyword.toLocaleLowerCase());
  let value = ritual.flowCategory.includes(input.pathway) ? 60 : 0;
  value += tags.reduce((total, tag) => total + (keywords.includes(tag) ? 12 : 0), 0);
  value += input.setting === "transit" && ritual.safety.transitSafe ? 12 : 0;
  value += (input.intensity ?? 4) >= 7 && ritual.safety.highIntensityEligible ? 18 : 0;
  value += Math.max(0, 10 - Math.abs(input.availableMinutes - ritual.durationMinutes) * 3);
  return value;
}

function normalizedIntensity(value: number | undefined) {
  const intensity = value ?? 4;
  return Number.isFinite(intensity) && intensity >= 1 && intensity <= 10 ? intensity : null;
}

/**
 * Applies safety handoff and hard eligibility constraints before deterministic scoring.
 * No UI should replace the handoff result with a ritual recommendation.
 */
export function selectSafetyAwareRitual(rituals: readonly SelectableRitual[], input: SelectionInput): SelectionResult {
  const intensity = normalizedIntensity(input.intensity);
  if (intensity === null) return handoff("no-safe-ritual");
  if (input.safetyTriggers?.length) return handoff("explicit-trigger");
  if (intensity >= 9) return handoff("very-high-intensity");
  const normalizedInput = { ...input, intensity };

  const candidates = rituals.filter((ritual) => safetyEligible(ritual, normalizedInput));
  const pathwayCandidates = candidates.filter((ritual) => ritual.flowCategory.includes(normalizedInput.pathway));
  if (!pathwayCandidates.length) return handoff("no-safe-ritual");

  const ranked = [...pathwayCandidates].sort((left, right) => {
    const scoreDifference = score(right, normalizedInput) - score(left, normalizedInput);
    return scoreDifference || left.durationMinutes - right.durationMinutes || left.id.localeCompare(right.id);
  });
  const ritual = ranked[0];
  const profile = normalizedInput.setting === "transit" ? "transit-safe" : intensity >= 7 ? "high-intensity" : "standard";
  return {
    kind: "ritual",
    ritual,
    score: score(ritual, normalizedInput),
    appliedSafetyProfile: profile,
    reason: `Selected one compatible ${profile} ritual for the requested pathway, time, setting, and adjustments.`,
  };
}
