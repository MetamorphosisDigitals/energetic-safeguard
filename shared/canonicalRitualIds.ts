import sourceCatalog from "../rituals_18_catalog.json";

type CanonicalCatalog = { rituals: Array<{ id: string }> };

const catalog = sourceCatalog as CanonicalCatalog;

/** The confirmed runtime ritual IDs, shared by browser and protected server contracts. */
export const canonicalRitualIds = new Set(catalog.rituals.map((ritual) => ritual.id));

export function isCanonicalRitualId(value: string) {
  return canonicalRitualIds.has(value);
}
