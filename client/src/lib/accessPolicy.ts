/** Pure access rules so trial behavior stays consistent as future plans are added. */
export const FREE_PRACTICE_LIMIT = 3;

export function freePracticesRemaining(completedCount: number) {
  return Math.max(0, FREE_PRACTICE_LIMIT - Math.max(0, completedCount));
}

export function requiresPremiumAccess(completedCount: number, hasPremiumAccess: boolean) {
  return !hasPremiumAccess && completedCount >= FREE_PRACTICE_LIMIT;
}
