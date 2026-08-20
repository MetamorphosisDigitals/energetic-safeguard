import sourceCatalog from "../../../rituals_18_catalog.json";
import { practices as legacyPractices, type Practice } from "./practices";

/**
 * The confirmed 18 rituals are the selectable runtime library. The earlier
 * catalog remains available only to resolve an existing user-owned record made
 * before this migration; it is not considered for new recommendations.
 */
export const canonicalRituals = sourceCatalog.rituals as unknown as Practice[];
export const activeRituals = canonicalRituals;
export const centralizedPracticeLibrary = [...canonicalRituals, ...legacyPractices];

export function findCanonicalRitual(id: string | null | undefined) {
  return activeRituals.find((ritual) => ritual.id === id);
}

export function findPracticeInCentralizedLibrary(id: string | null | undefined) {
  return centralizedPracticeLibrary.find((practice) => practice.id === id);
}
