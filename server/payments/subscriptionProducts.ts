export const subscriptionProducts = {
  sanctuary_plus_monthly: {
    key: "sanctuary_plus_monthly",
    name: "Sanctuary Plus Monthly",
    description: "Optional cloud continuity and advanced habit tools billed monthly.",
    priceLabel: "$6.99/month",
    stripePriceEnv: "STRIPE_PLUS_MONTHLY_PRICE_ID",
  },
  sanctuary_plus_annual: {
    key: "sanctuary_plus_annual",
    name: "Sanctuary Plus Annual",
    description: "Optional cloud continuity and advanced habit tools billed annually.",
    priceLabel: "$49/year",
    stripePriceEnv: "STRIPE_PLUS_ANNUAL_PRICE_ID",
  },
} as const;

export type SubscriptionProductKey = keyof typeof subscriptionProducts;

export function isSubscriptionProductKey(value: string): value is SubscriptionProductKey {
  return value in subscriptionProducts;
}

export function getSubscriptionPriceId(key: SubscriptionProductKey) {
  const product = subscriptionProducts[key];
  const priceId = process.env[product.stripePriceEnv]?.trim();
  if (!priceId) {
    throw new Error(`${product.stripePriceEnv} must be configured before Plus checkout is enabled.`);
  }
  return priceId;
}
