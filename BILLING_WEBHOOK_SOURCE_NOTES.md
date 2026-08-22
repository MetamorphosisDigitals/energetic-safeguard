# Billing Webhook Source Notes

## Stripe Subscription Webhooks

Source: https://docs.stripe.com/billing/subscriptions/webhooks

Verified details used in the billing blueprint and technical deck:

- Subscription integrations require webhook handling because subscription activity occurs asynchronously.
- Stripe documents `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, and `charge.refunded` as relevant lifecycle events.
- Stripe identifies `invoice.paid` with an active subscription as a suitable point to provision access.
- Stripe documents payment failure, authentication-required, cancellation, and refund events as lifecycle states requiring application handling.

## Stripe Webhook Endpoint Requirements

Source: https://docs.stripe.com/webhooks

Verified details used in the billing blueprint and technical deck:

- Production event destinations deliver HTTPS JSON payloads to an application endpoint.
- The application should verify the event using the raw request body, `Stripe-Signature` header, and webhook signing secret before handling the event.
- Stripe recommends returning a successful response promptly before complex downstream work.
- Stripe documents local testing through Stripe CLI forwarding and registered public event destinations for deployment.

## Stripe Subscription Lifecycle

Source: https://docs.stripe.com/billing/subscriptions/overview

Verified details used in the billing blueprint and technical deck:

- Checkout redirects are not the authoritative subscription-access state; invoices, subscription status, and verified events determine lifecycle status.
- Initial subscriptions can be incomplete until successful payment and then become active.
- `invoice.paid` accompanies successful payment and can support access provisioning.
- Statuses include trialing, active, incomplete, incomplete_expired, past_due, canceled, unpaid, and paused.
