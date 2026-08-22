# Subscription Lifecycle Production Readiness

## Current status

The application now has an additive subscription entitlement projection, a durable webhook-event ledger, a seven-day grace policy for optional paid capabilities, and an installed Stripe CLI contract harness. The full application validation passes with **92 tests** and a production build. Guided rituals and safety handoffs are explicitly unconditional in the subscription access policy.

| Area | Ready now | External activation still required |
| --- | --- | --- |
| Event ledger | Yes; unique provider event IDs prevent sequential replay projection. | None. |
| Recurring invoice projection | Yes; `invoice.paid` activates an optional subscription and clears grace. | Configure real subscription Prices and Checkout metadata. |
| Failed payments | Yes; `invoice.payment_failed` sets `past_due` with a seven-day grace period. | Configure Stripe retry and customer-email settings. |
| Cancellation | Yes; cancellation is projected without changing ritual or safety access. | Decide whether cancellation remains active to the period end in the live offer configuration. |
| Stripe CLI | Installed (`stripe version 1.50.4`) and harness configured. | Claim the project sandbox, authenticate with `stripe login`, and set the listener signing secret. |
| Paid access | Policy is ready for optional cloud continuity and advanced habit tools only. | Set live Prices and explicitly enable any UI gating; rituals remain unrestricted. |

## Final sandbox activation

1. Claim the project Stripe sandbox and complete Stripe account authentication in the open claim page.
2. Run `stripe login` in the sandbox terminal, then start the application with `pnpm dev`.
3. Start the listener: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
4. Store the listener secret through the project’s secret configuration as `STRIPE_WEBHOOK_SECRET`; never commit it.
5. Run `pnpm test:stripe-cli-contract`, then trigger `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, and `customer.subscription.deleted`.
6. Verify one `billing_webhook_events` record per provider event and the expected `subscription_entitlements` projection. Confirm that guided rituals and safety handoffs remain available through active, grace, canceled, and unpaid states.

## Non-negotiable access boundary

> Subscription status can govern only optional continuity and advanced habit features. It must never gate a guided ritual, the safety handoff, or the one-minute orientation.
