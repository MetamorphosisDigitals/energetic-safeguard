import { type RoseRayId } from "@/data/catalog";
import { practices, type FlowCategory, type Practice } from "@/data/practices";

export type FavoriteLibraryFilter = {
  pathway: FlowCategory | "all";
  roseRayId: RoseRayId | "all";
};

export function filterSavedPractices<T extends { practiceId: string }>(favorites: readonly T[], filter: FavoriteLibraryFilter) {
  return favorites.flatMap((favorite) => {
    const practice = practices.find((item) => item.id === favorite.practiceId);
    if (!practice) return [];
    if (filter.pathway !== "all" && !practice.flowCategory.includes(filter.pathway)) return [];
    if (filter.roseRayId !== "all" && practice.roseRayId !== filter.roseRayId) return [];
    return [{ favorite, practice: practice as Practice }];
  });
}
