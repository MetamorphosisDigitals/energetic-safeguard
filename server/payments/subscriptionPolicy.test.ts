import { describe, expect, it } from "vitest";
import { getSubscriptionFeatureAccess, gracePeriodEndsAt, SUBSCRIPTION_GRACE_PERIOD_DAYS } from "./subscriptionPolicy";

describe("subscription paid-feature and grace-period policy", () => {
  const now = new Date("2026-08-22T12:00:00.000Z");

  it("keeps rituals and safety handoffs available regardless of billing state", () => {
    const access = getSubscriptionFeatureAccess({ status: "unpaid", offerKey: "cloud_continuity_monthly", graceEndsAt: null }, now);
    expect(access.guidedRituals).toBe(true);
    expect(access.safetyHandoffs).toBe(true);
    expect(access.cloudContinuity).toBe(false);
  });

  it("allows optional cloud continuity during the seven-day payment grace period", () => {
    const graceEndsAt = gracePeriodEndsAt(now);
    const access = getSubscriptionFeatureAccess({ status: "past_due", offerKey: "cloud_continuity_monthly", graceEndsAt }, now);
    expect(graceEndsAt.getUTCDate()).toBe(now.getUTCDate() + SUBSCRIPTION_GRACE_PERIOD_DAYS);
    expect(access.isInGracePeriod).toBe(true);
    expect(access.cloudContinuity).toBe(true);
  });

  it("removes only optional paid capabilities after grace expires", () => {
    const access = getSubscriptionFeatureAccess({ status: "past_due", offerKey: "rhythm_plus_monthly", graceEndsAt: new Date(now.getTime() - 1) }, now);
    expect(access.cloudContinuity).toBe(false);
    expect(access.advancedHabitTools).toBe(false);
    expect(access.guidedRituals).toBe(true);
  });
});
