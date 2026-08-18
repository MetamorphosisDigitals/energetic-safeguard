import { describe, expect, it } from "vitest";
import { premiumOffers } from "./products";

describe("premium offers", () => {
  it("defines the two confirmed USD lifetime offers with distinct Stripe prices", () => {
    expect(premiumOffers.current_app_lifetime.priceLabel).toBe("$19 USD");
    expect(premiumOffers.future_updates_lifetime.priceLabel).toBe("$39 USD");
    expect(premiumOffers.current_app_lifetime.stripePriceId).not.toBe(premiumOffers.future_updates_lifetime.stripePriceId);
  });
});

