export const SUBSCRIPTION_GRACE_PERIOD_DAYS = 7;

export const subscriptionOffers = {
  cloud_continuity_monthly: ["cloud_continuity"],
  rhythm_plus_monthly: ["cloud_continuity", "advanced_habit_tools"],
} as const;

export type SubscriptionOfferKey = keyof typeof subscriptionOffers;
export type PaidFeatureKey = (typeof subscriptionOffers)[SubscriptionOfferKey][number];

export type SubscriptionAccessState = {
  status: "trialing" | "active" | "past_due" | "canceled" | "unpaid";
  offerKey: string;
  graceEndsAt: Date | null;
};

export function isSubscriptionOfferKey(value: string): value is SubscriptionOfferKey {
  return value in subscriptionOffers;
}

export function getSubscriptionFeatureAccess(
  entitlement: SubscriptionAccessState | null | undefined,
  now = new Date(),
) {
  const paidFeatures = entitlement && isSubscriptionOfferKey(entitlement.offerKey)
    ? new Set<PaidFeatureKey>(subscriptionOffers[entitlement.offerKey])
    : new Set<PaidFeatureKey>();
  const inGrace = Boolean(entitlement?.status === "past_due" && entitlement.graceEndsAt && entitlement.graceEndsAt > now);
  const subscribed = Boolean(entitlement && (entitlement.status === "active" || entitlement.status === "trialing" || inGrace));

  return {
    // A non-negotiable product boundary: rituals and safety never depend on billing.
    guidedRituals: true,
    safetyHandoffs: true,
    cloudContinuity: subscribed && paidFeatures.has("cloud_continuity"),
    advancedHabitTools: subscribed && paidFeatures.has("advanced_habit_tools"),
    isInGracePeriod: inGrace,
    graceEndsAt: inGrace ? entitlement?.graceEndsAt ?? null : null,
  };
}

export function gracePeriodEndsAt(from = new Date()) {
  const result = new Date(from);
  result.setUTCDate(result.getUTCDate() + SUBSCRIPTION_GRACE_PERIOD_DAYS);
  return result;
}
