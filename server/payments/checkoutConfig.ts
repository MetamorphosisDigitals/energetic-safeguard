import Stripe from "stripe";

function parseHttpOrigin(value: string, label: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${label} must use http or https.`);
  }
  return url.origin;
}

/**
 * Production checkout redirects always use the configured application URL.
 * Request Origin is accepted only as a development/test fallback.
 */
export function getCheckoutReturnOrigin(requestOrigin: string | undefined) {
  const configuredAppUrl = process.env.APP_URL?.trim();
  if (configuredAppUrl) {
    const origin = parseHttpOrigin(configuredAppUrl, "APP_URL");
    if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) {
      throw new Error("APP_URL must use https in production.");
    }
    return origin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL is required for production checkout redirects.");
  }
  if (!requestOrigin) throw new Error("Checkout requires a browser origin outside production.");
  return parseHttpOrigin(requestOrigin, "Request origin");
}

/** Stripe is initialized only when a payment route is actually used. */
export function getStripeClient() {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY is required to create a checkout session.");
  return new Stripe(apiKey);
}
