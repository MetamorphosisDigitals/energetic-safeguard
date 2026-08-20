import { activeRituals } from "@/data/canonicalRituals";
import { type Practice } from "@/data/practices";
import type { PracticeQuery } from "@/lib/recommendPractice";
import {
  selectSafetyAwareRitual,
  type Adjustment,
  type Modality,
  type SafetyTrigger,
  type SelectableRitual,
} from "@/lib/safetySelectionEngine";

const HIGH_INTENSITY_IDS = new Set([
  "five-sense-arrival",
  "pocket-anchor",
  "five-sense-orientation",
  "one-object-reset",
  "energy-conservation-pause",
]);

const TRANSIT_SAFE_IDS = new Set([
  "pocket-anchor",
  "three-breath-boundary",
  "five-sense-orientation",
  "one-object-reset",
]);

const safetyPatternMap: Array<[SafetyTrigger, RegExp]> = [
  ["immediate-danger", /immediate danger|being attacked|someone is attacking|in danger now/i],
  ["unable-to-stay-safe", /cannot stay safe|can.t stay safe|not safe right now|feel unsafe/i],
  ["severe-physical-symptoms", /severe physical|chest pain|cannot breathe|passed out|fainting/i],
  ["severe-disorientation", /severely disoriented|do not know where i am|can.t orient/i],
  ["self-harm-or-harm-thoughts", /hurt myself|harm myself|suicide|kill myself|hurt someone|harm someone/i],
];

function compatibleModality(modality: string): Modality | null {
  return ["sensory", "breath", "visualization", "movement", "intention", "boundary", "reflection", "focus"].includes(modality)
    ? modality as Modality
    : null;
}

function toSelectableRitual(practice: Practice): SelectableRitual {
  const highIntensityEligible = HIGH_INTENSITY_IDS.has(practice.id);
  return {
    id: practice.id,
    displayName: practice.displayName,
    active: practice.active,
    flowCategory: practice.flowCategory,
    intensityRange: practice.intensityRange,
    durationMinutes: practice.durationMinutes,
    suitableLocations: practice.suitableLocations,
    preferredModality: practice.preferredModality.flatMap((modality) => {
      const compatible = compatibleModality(modality);
      return compatible ? [compatible] : [];
    }),
    accessibilityTags: practice.accessibilityTags,
    keywords: practice.keywords,
    safety: {
      highIntensityEligible,
      transitSafe: TRANSIT_SAFE_IDS.has(practice.id),
      requiresExternalOrientation: highIntensityEligible,
      fallbackBehavior: "safety-handoff",
    },
  };
}

function deriveSafetyTriggers(situation: string): SafetyTrigger[] {
  return safetyPatternMap.flatMap(([trigger, pattern]) => pattern.test(situation) ? [trigger] : []);
}

function normalizeAdjustments(adjustments: readonly string[]): Adjustment[] {
  return adjustments.filter((adjustment): adjustment is Adjustment => [
    "keep-eyes-open", "avoid-breath", "avoid-visualization", "minimal-movement", "discreet", "low-energy",
  ].includes(adjustment));
}

/** Bridges live intake data to the safety engine before a recommendation is rendered. */
export function selectLiveSafetyAwarePractice(query: PracticeQuery, candidateRitualIds?: readonly string[]) {
  const candidates = candidateRitualIds
    ? activeRituals.filter((ritual) => candidateRitualIds.includes(ritual.id))
    : activeRituals;
  return selectSafetyAwareRitual(candidates.map(toSelectableRitual), {
    pathway: query.pathway,
    primaryAnswerTags: query.situation.toLocaleLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
    secondaryTags: [query.energy, query.location],
    availableMinutes: query.availableMinutes,
    setting: query.location,
    intensity: query.intensity,
    adjustments: normalizeAdjustments(query.adjustments),
    safetyTriggers: deriveSafetyTriggers(query.situation),
  });
}
