import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not available.");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const offers = [
  {
    key: "current_app_lifetime",
    name: "The Energetic Safeguard — Current App Lifetime",
    description: "Lifetime access to the current guided pathways and curated practice library.",
    unitAmount: 1900,
  },
  {
    key: "future_updates_lifetime",
    name: "The Energetic Safeguard — Lifetime + Future Updates",
    description: "Lifetime access to the current app plus future in-app practice and meditation content.",
    unitAmount: 3900,
  },
];

const created = [];

for (const offer of offers) {
  const product = await stripe.products.create({
    name: offer.name,
    description: offer.description,
    metadata: { energetic_safeguard_offer: offer.key },
  });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: offer.unitAmount,
    metadata: { energetic_safeguard_offer: offer.key },
  });

  created.push({ key: offer.key, productId: product.id, priceId: price.id });
}

console.log(JSON.stringify({ offers: created }, null, 2));
