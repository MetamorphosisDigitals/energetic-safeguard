import { afterEach, describe, expect, it } from "vitest";
import { getSubscriptionPriceId, isSubscriptionProductKey, subscriptionProducts } from "./subscriptionProducts";

describe("Sanctuary Plus product catalog", () => {
  afterEach(() => {
    delete process.env.STRIPE_PLUS_MONTHLY_PRICE_ID;
    delete process.env.STRIPE_PLUS_ANNUAL_PRICE_ID;
  });

  it("publishes the agreed monthly and annual price labels", () => {
    expect(subscriptionProducts.sanctuary_plus_monthly.priceLabel).toBe("$6.99/month");
    expect(subscriptionProducts.sanctuary_plus_annual.priceLabel).toBe("$49/year");
  });

  it("recognizes only current Plus product keys", () => {
    expect(isSubscriptionProductKey("sanctuary_plus_monthly")).toBe(true);
    expect(isSubscriptionProductKey("sanctuary_plus_annual")).toBe(true);
    expect(isSubscriptionProductKey("current_app_lifetime")).toBe(false);
  });

  it("requires Stripe price IDs to be configured before checkout", () => {
    expect(() => getSubscriptionPriceId("sanctuary_plus_monthly")).toThrow("STRIPE_PLUS_MONTHLY_PRICE_ID");
    process.env.STRIPE_PLUS_MONTHLY_PRICE_ID = "price_monthly_test";
    expect(getSubscriptionPriceId("sanctuary_plus_monthly")).toBe("price_monthly_test");
  });
});
