import { spawnSync } from "node:child_process";

const required = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required sandbox configuration: ${missing.join(", ")}`);
  process.exit(1);
}

const cli = spawnSync("stripe", ["version"], { encoding: "utf8" });
if (cli.status !== 0) {
  console.error("Stripe CLI is not installed or authenticated. Install it, run `stripe login`, then repeat this command.");
  process.exit(1);
}

console.log("Stripe CLI sandbox contract harness is configured.");
console.log("Run this in one terminal:");
console.log("  stripe listen --forward-to localhost:3000/api/stripe/webhook");
console.log("Then trigger signed sandbox events in another terminal:");
console.log("  stripe trigger checkout.session.completed");
console.log("  stripe trigger invoice.paid");
console.log("  stripe trigger invoice.payment_failed");
console.log("  stripe trigger customer.subscription.deleted");
console.log("Verify billing_webhook_events and subscription_entitlements after each event.");
