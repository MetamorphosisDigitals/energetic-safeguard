# The Energetic Safeguard: Live Billing and Webhook Architecture

## Scope and Product Boundary

This blueprint describes a production-ready integration with **Stripe Billing** for the proposed optional **Continuity** and **Rhythm Plus** tiers. It does not enable billing, remove unrestricted ritual access, or change the current access policy. All 18 guided rituals, safety handoffs, and the basic Daily Routine remain available without payment.

The paid boundary is limited to optional account-based continuity and advanced habit features, such as cloud plan history, cross-device restoration, richer organization, and future analytics. The server—not the browser and not the checkout redirect—is the source of truth for any paid entitlement.

## Architecture Overview

```text
User → Pricing screen → Server creates Stripe Checkout Session
     → Stripe-hosted checkout
     → Stripe sends signed webhook events to /api/stripe/webhook
     → Webhook verifier + event ledger
     → Entitlement projector updates application database
     → Dashboard reads server-owned entitlement state
```

Stripe’s subscription lifecycle is asynchronous, so the application must use verified webhooks rather than relying on a success redirect to grant features. Stripe recommends webhook handling for subscription status changes and payment outcomes, and identifies `invoice.paid` as a suitable point to provision access when the subscription is active. [1] [3]

## Recommended Products and Price Mapping

| Application tier | Stripe product / price | Billing cadence | Server entitlement keys |
| --- | --- | --- | --- |
| Grounded | No Stripe product required | Free | `ritual_access` (always true) |
| Continuity | `continuity_monthly`, `continuity_annual` | Monthly / annual | `cloud_backup`, `cloud_restore`, `cloud_history` |
| Rhythm Plus | `rhythm_plus_monthly`, `rhythm_plus_annual` | Monthly / annual | Continuity keys plus `advanced_habit_insights`, `advanced_exports` |

Price IDs must be environment variables rather than frontend constants:

```text
STRIPE_PRICE_CONTINUITY_MONTHLY
STRIPE_PRICE_CONTINUITY_ANNUAL
STRIPE_PRICE_RHYTHM_PLUS_MONTHLY
STRIPE_PRICE_RHYTHM_PLUS_ANNUAL
```

## Database Additions

The existing `premium_entitlements` table should remain the feature-access projection. Add provider mapping, a Stripe event ledger, and an optional billing-customer table. Store only provider identifiers and business state; never store card data, payment-method secrets, or webhook signing secrets.

### 1. `billing_customers`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | bigint primary key | Internal record ID |
| `user_id` | bigint unique foreign key | Links one application user to one billing customer |
| `provider` | varchar(32) | Initially `stripe` |
| `provider_customer_id` | varchar(255) unique | Stripe customer ID |
| `created_at` / `updated_at` | timestamp | Audit fields |

### 2. Extend `premium_entitlements`

| Column | Type | Purpose |
| --- | --- | --- |
| `provider_subscription_id` | varchar(255) nullable, unique | Stripe subscription ID |
| `provider_price_id` | varchar(255) nullable | Current Stripe Price ID |
| `plan_key` | varchar(64) | `continuity` or `rhythm_plus` |
| `status` | varchar(32) | Projected provider status: `active`, `trialing`, `past_due`, `canceled`, `unpaid`, or `incomplete` |
| `current_period_end_at` | timestamp nullable | Used to calculate continuing paid access when appropriate |
| `cancel_at_period_end` | boolean | Supports graceful cancellation messaging |

### 3. `billing_webhook_events`

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | bigint primary key | Internal record ID |
| `provider` | varchar(32) | `stripe` |
| `provider_event_id` | varchar(255) unique | Idempotency key from Stripe event ID |
| `event_type` | varchar(128) | Event classification for audit and replay |
| `payload_hash` | char(64) | SHA-256 of raw payload for diagnostics; raw payload is not retained by default |
| `received_at` / `processed_at` | timestamp | Delivery and projection tracking |
| `processing_status` | varchar(32) | `received`, `processed`, `ignored`, or `failed` |
| `failure_reason` | text nullable | Sanitized processing failure detail |

### Migration Order

1. Add `billing_customers` and `billing_webhook_events`.
2. Extend `premium_entitlements` with nullable provider columns.
3. Backfill current internal entitlement rows with `plan_key = 'legacy'` only if needed for history; do not infer paid status from old local data.
4. Add unique indexes before deploying the webhook handler.
5. Deploy the handler in observe-only mode, then enable checkout after test events project correctly.

## Server Routes and Protected Procedures

### Public Raw-Body Webhook Route

```text
POST /api/stripe/webhook
```

This route is deliberately **not** a tRPC JSON procedure. Signature verification requires the unmodified request body and the `Stripe-Signature` header. Stripe requires a publicly reachable HTTPS endpoint in production and documents signature verification with the raw payload and endpoint signing secret. [2]

**Handler sequence:**

1. Read raw request bytes before any JSON parser consumes them.
2. Verify the Stripe signature using `STRIPE_WEBHOOK_SECRET`.
3. Reject invalid signatures with `400`; do not expose internal details.
4. Insert the Stripe event ID into `billing_webhook_events` with a unique constraint. If it already exists, return `2xx` without reprojecting state.
5. Normalize the event into the current customer, subscription, price, invoice, and period state.
6. Update `billing_customers` and `premium_entitlements` in one database transaction.
7. Mark the event processed and return `2xx` quickly. Complex non-entitlement work must occur after the core projection or through a durable job mechanism.

### Authenticated Application Procedures

| Procedure | Input | Result | Notes |
| --- | --- | --- | --- |
| `billing.createCheckout` | `{ planKey, billingCadence }` | `{ checkoutUrl }` | Validates allowed plan and creates a Stripe Checkout Session with the signed-in user ID in metadata. |
| `billing.createPortalSession` | none | `{ portalUrl }` | Lets a signed-in customer manage payment method, invoices, and cancellation in Stripe’s portal. |
| `billing.getStatus` | none | entitlement summary | Reads the projected server state only. |
| `billing.getPlans` | none | public tier definitions | Returns display-safe price and feature metadata; does not expose secret IDs. |

The server must derive the Stripe customer from `ctx.user.id`, rather than accepting a Stripe customer ID from the client.

## Event-to-Entitlement Projection

| Stripe event | Required action | Entitlement treatment |
| --- | --- | --- |
| `checkout.session.completed` | Associate metadata user ID to Stripe customer/subscription; do not grant access solely from redirect state | Record mapping; wait for authoritative subscription or invoice state. |
| `customer.subscription.created` / `updated` | Upsert subscription, plan, period end, cancellation flag, and status | Project current status; `active` and `trialing` can grant paid feature keys. |
| `invoice.paid` | Confirm recurring or initial payment and subscription status | Provision or extend paid feature keys when subscription is active. [1] |
| `invoice.payment_failed` | Preserve record and set an account-visible payment issue state | Do not remove unrestricted rituals. Restrict only paid keys according to the defined grace policy. [1] |
| `customer.subscription.deleted` | Mark subscription terminal and retain audit data | Remove paid keys at the end of valid access, never basic ritual access. |
| `charge.refunded` | Reconcile refund to invoice and subscription | Apply the written refund policy to paid keys and record an audit event. [1] |

Stripe can deliver events more than once and does not guarantee a business-friendly order, so every projection must be idempotent and based on event/object timestamps or a fresh provider retrieval when state order is ambiguous. The event ledger is the primary duplicate guard; provider object timestamps and current subscription status are the secondary guard.

## Access Rules

| Feature | Grounded | Continuity | Rhythm Plus |
| --- | --- | --- | --- |
| Guided rituals and safety handoffs | Always available | Always available | Always available |
| Local Daily Routine, notes, and basic milestones | Available | Available | Available |
| Cloud backup, restore, and cross-device history | Not included | Included | Included |
| Cloud plan management | Not included | Included | Included |
| Advanced habit insights and exports | Not included | Not included | Included |

The current frontend has `hasPremiumAccess` hardcoded for unrestricted ritual access. Do not replace that behavior with billing gating. Introduce a separate `hasCloudContinuity` and `hasAdvancedHabitTools` decision path sourced from `billing.getStatus`.

## Security and Reliability Controls

| Control | Requirement |
| --- | --- |
| Secret handling | Store `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and price IDs only through the project secret manager. Never commit them or expose them to the browser. |
| Raw payload | Bypass JSON parsing only for the webhook route; use raw bytes for signature verification. |
| Metadata | Put only the internal user ID and plan key in Checkout metadata. Do not put routine notes, reflections, or health-adjacent content in Stripe metadata. |
| Idempotency | Use Stripe event ID uniqueness for inbound events and application idempotency keys for Checkout creation. |
| Authorization | All account status and portal calls use the authenticated application user; all webhook updates map through a verified Stripe customer or signed metadata. |
| Auditability | Keep event type, provider event ID, projection outcome, and sanitized failure details. Avoid keeping raw payment payloads unless legal and operational requirements require it. |
| Reconciliation | Schedule a low-frequency daily job to compare active local entitlement records with Stripe subscription state, alert on mismatches, and repair only through controlled projection logic. |

## Testing Plan

### Unit and Router Tests

1. Reject invalid checkout plan keys and invalid billing cadence.
2. Confirm a signed-in user cannot create a portal session for another user’s billing customer.
3. Confirm duplicate webhook event IDs do not update entitlement state twice.
4. Confirm `invoice.paid` projects paid keys while preserving all ritual access.
5. Confirm payment failure affects only paid keys according to the selected grace policy.
6. Confirm cancellation, deletion, refund, and resumed subscription transitions are correctly projected.
7. Confirm stale or out-of-order provider objects cannot overwrite a newer projected subscription state.

### Integration Tests

1. Use Stripe’s test environment and CLI forwarding to exercise raw-body signature verification.
2. Complete a Checkout flow, assert redirect is informational, then assert webhook projection changes the authenticated dashboard state.
3. Trigger renewal, payment-failure, cancellation, and refund test events.
4. Verify a user can always open rituals and safety support during every billing state.
5. Verify customer-portal cancellation updates the dashboard only after a verified event projects the change.

## Production Runbook

1. Claim or create the production Stripe account; the current project’s test sandbox must be claimed before use.
2. Create Stripe Products and Prices for Continuity and Rhythm Plus.
3. Add live secrets through the project secret manager.
4. Deploy the raw-body webhook endpoint on the production HTTPS domain.
5. Register the endpoint in Stripe Workbench and subscribe to the listed event types.
6. Test sandbox events, replay events, and inspect the event ledger before enabling Checkout for users.
7. Turn on Checkout for one internal account or a small controlled cohort first.
8. Monitor webhook failures, duplicate deliveries, billing-to-entitlement latency, and customer-support contacts.
9. Enable broad availability only after reconciliation reports no unresolved mismatch.

## Decision Required Before Implementation

The current product requirement is that guided rituals remain unrestricted. Before implementation, confirm the exact paid feature matrix, grace period for failed payments, cancellation access policy, refund policy, tax/receipt handling, and whether a trial is wanted. This blueprint assumes **no trial** and no gate on rituals.

## References

[1]: https://docs.stripe.com/billing/subscriptions/webhooks "Stripe: Using webhooks with subscriptions"
[2]: https://docs.stripe.com/webhooks "Stripe: Receive Stripe events in your webhook endpoint"
[3]: https://docs.stripe.com/billing/subscriptions/overview "Stripe: How subscriptions work"
