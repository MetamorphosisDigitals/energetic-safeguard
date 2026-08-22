## Cover

**The Energetic Safeguard**

**Live Billing & Webhook Architecture**

Secure subscription continuity without restricting rituals

## Slide 1

### Support remains free. Continuity is optional.

- All 18 guided rituals and safety handoffs remain unrestricted.
- Billing applies only to optional cloud continuity and advanced habit tools.
- Server-owned entitlements determine paid capability; checkout redirects do not.

## Slide 2

### One source of truth for each concern

- Browser: chooses a plan and displays projected access.
- Application server: creates Checkout, verifies events, and projects entitlements.
- Stripe: collects payment, manages the subscription lifecycle, and delivers events.
- Database: stores customer mappings, subscription state, entitlement projection, and event audit records.

## Slide 3

### Checkout is an intent—not access

- A signed-in user selects Continuity or Rhythm Plus.
- The server creates a Stripe Checkout Session with only user and plan metadata.
- Stripe hosts payment collection; card data never enters the application.
- Return URLs are informational; verified events determine paid access.

## Slide 4

### Verified events project billing state

- Stripe sends HTTPS events to one raw-body webhook endpoint.
- The handler verifies the Stripe signature before any database operation.
- A unique provider event ID prevents duplicate projection.
- The handler updates customer mapping and entitlement state transactionally, then returns success promptly. [1] [2]

## Slide 5

### Lifecycle events map to narrow feature changes

| Event | Server action | User effect |
| --- | --- | --- |
| `checkout.session.completed` | Link user, customer, and subscription | No immediate browser-side entitlement assumption |
| `invoice.paid` | Project active plan and period | Optional paid continuity keys become available |
| `invoice.payment_failed` | Record payment issue and grace state | Rituals remain available; paid keys follow policy |
| `customer.subscription.deleted` | End paid projection | Only optional paid keys are removed |
| `charge.refunded` | Reconcile refund policy | Auditable change to optional paid keys |

## Slide 6

### Entitlements separate support from billing

- `ritual_access` is always true.
- Continuity controls cloud backup, restore, and history.
- Rhythm Plus adds advanced habit insights and exports when released.
- The dashboard reads projected server state, never Stripe credentials.

## Slide 7

### Reliability is built for asynchronous delivery

- Signature verification uses the original request bytes and endpoint signing secret.
- Event ledger records received, processed, ignored, or failed state.
- Duplicate events are safe; stale state cannot overwrite newer projection.
- A daily reconciliation compares provider subscriptions with application entitlements. [1] [2]

## Slide 8

### Privacy and security stay narrow

- Secret keys and price IDs live only in server-side project secrets.
- Checkout metadata contains user and plan identifiers—never reflections or notes.
- Cloud-plan data remains user-owned and individually deletable.
- Portal sessions are derived from the authenticated user, never a client-supplied customer ID.

## Slide 9

### Simulated tests verify the current webhook boundary

- Paid checkout completion projects the existing entitlement record.
- Failed invoice events do not restrict ritual access.
- Invalid signatures create no side effect.
- Duplicate delivery follows the idempotent upsert path.
- Projection failure returns a retryable server response.

## Slide 10

### Production rollout is deliberately staged

- Claim the billing account, define Products and Prices, and set live secrets.
- Register the HTTPS webhook destination and test signed events in a sandbox.
- Deploy in observe-only mode; verify the event ledger and reconciliation report.
- Launch Checkout to a controlled cohort before broad availability.

## Slide 11

**Billing supports continuity.**

**It never stands between a user and a ritual.**

## References

[1] Stripe, *Using webhooks with subscriptions*: https://docs.stripe.com/billing/subscriptions/webhooks

[2] Stripe, *Receive Stripe events in your webhook endpoint*: https://docs.stripe.com/webhooks
