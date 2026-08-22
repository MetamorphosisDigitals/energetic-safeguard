# Stripe CLI Sandbox Contract Tests

The Stripe CLI is installed on the development environment (`stripe version 1.50.4`). The contract harness is available through `pnpm test:stripe-cli-contract` and intentionally requires a claimed Stripe sandbox, authenticated CLI session, and webhook signing secret before it can target a real gateway.

## One-time sandbox setup

Claim the project test sandbox in Stripe, then authenticate the CLI with `stripe login`. Start the local app with `pnpm dev`, and in a second terminal run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the endpoint signing secret emitted by the listener into the project secret `STRIPE_WEBHOOK_SECRET`. Do not put it in source control.

## Contract sequence

Run `pnpm test:stripe-cli-contract` to verify the prerequisites. In a second terminal, trigger these signed sandbox events against the listener:

```bash
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

After each trigger, verify the `billing_webhook_events` row, the related `subscription_entitlements` projection, and that guided rituals and safety handoffs remain available. Use a real Stripe Checkout flow with valid application metadata for the final checkout-to-entitlement contract; generic CLI fixtures do not include the app’s user reference and offer key.

## Current limitation

The sandbox account must be claimed and authenticated before real Stripe CLI events can be delivered. Until then, the repository’s HTTP-level simulated lifecycle tests remain the executable regression suite.
