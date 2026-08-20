import sourceCatalog from "../../../rituals_18_catalog.json";
import { practices, type Practice } from "./practices";

/**
 * Adapter for the user-confirmed 18-ritual source of truth. The broader live
 * catalog migration remains incremental, while routes that opt in can resolve
 * directly from this centralized source without duplicating ritual content.
 */
export const canonicalRituals = sourceCatalog.rituals as unknown as Practice[];
export const centralizedPracticeLibrary = [...practices, ...canonicalRituals];

export function findCanonicalRitual(id: string | null | undefined) {
  return canonicalRituals.find((ritual) => ritual.id === id);
}

export function findPracticeInCentralizedLibrary(id: string | null | undefined) {
  return centralizedPracticeLibrary.find((practice) => practice.id === id);
}
