/**
 * Central catalog for the two confirmed one-time lifetime offers. Price values remain
 * in Stripe; this file intentionally stores only the identifiers used to open Checkout.
 */
export const premiumOffers = {
  current_app_lifetime: {
    key: "current_app_lifetime",
    name: "Current App Lifetime",
    description: "Lifetime access to the current guided pathways and curated practice library.",
    priceLabel: "$19 USD",
    stripePriceId: "price_1U5qchBAWbTQwfq7HwKnvOze",
  },
  future_updates_lifetime: {
    key: "future_updates_lifetime",
    name: "Lifetime + Future Updates",
    description: "Lifetime access to the current app plus future in-app practice and meditation content.",
    priceLabel: "$39 USD",
    stripePriceId: "price_1U5qchBAWbTQwfq7kXD251eg",
  },
} as const;

export type PremiumOfferKey = keyof typeof premiumOffers;

export function isPremiumOfferKey(value: string): value is PremiumOfferKey {
  return value in premiumOffers;
}

