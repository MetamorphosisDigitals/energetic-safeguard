import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { claimBillingWebhookEvent, completeBillingWebhookEvent, getSubscriptionEntitlementByStripeId, savePremiumEntitlement, saveSubscriptionEntitlement } from "../db";
import { isPremiumOfferKey } from "./products";
import { gracePeriodEndsAt, isSubscriptionOfferKey } from "./subscriptionPolicy";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function stripeId(value: unknown) {
  return typeof value === "string" ? value : typeof value === "object" && value && "id" in value && typeof value.id === "string" ? value.id : null;
}

function unixDate(value: unknown) {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

async function handleCompletedCheckout(session: Stripe.Checkout.Session) {
  const userId = Number(session.client_reference_id);
  const offerKey = session.metadata?.offer_key;
  if (!Number.isInteger(userId) || !offerKey || !isPremiumOfferKey(offerKey) || session.payment_status !== "paid") return null;
  await savePremiumEntitlement({ userId, offerKey, stripeCustomerId: stripeId(session.customer), stripePaymentIntentId: stripeId(session.payment_intent), stripeCheckoutSessionId: session.id });
  return userId;
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const userId = Number(session.client_reference_id);
  const offerKey = session.metadata?.offer_key;
  const stripeSubscriptionId = stripeId(session.subscription);
  const stripeCustomerId = stripeId(session.customer);
  if (!Number.isInteger(userId) || !offerKey || !isSubscriptionOfferKey(offerKey) || !stripeSubscriptionId || !stripeCustomerId) return null;
  await saveSubscriptionEntitlement({ userId, offerKey, stripeCustomerId, stripeSubscriptionId, stripePriceId: null, status: "trialing", currentPeriodEnd: null, graceEndsAt: null, lastInvoiceId: null, lastPaidAt: null, canceledAt: null });
  return userId;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = stripeId((invoice as unknown as { subscription?: unknown }).subscription);
  if (!stripeSubscriptionId) return null;
  const existing = await getSubscriptionEntitlementByStripeId(stripeSubscriptionId);
  if (!existing) return null;
  const line = invoice.lines.data[0] as unknown as { period?: { end?: number }; price?: { id?: string } } | undefined;
  await saveSubscriptionEntitlement({ userId: existing.userId, offerKey: existing.offerKey, stripeCustomerId: existing.stripeCustomerId, stripeSubscriptionId, stripePriceId: line?.price?.id ?? existing.stripePriceId, status: "active", currentPeriodEnd: unixDate(line?.period?.end), graceEndsAt: null, lastInvoiceId: invoice.id, lastPaidAt: new Date(), canceledAt: null });
  return existing.userId;
}

async function handleInvoiceFailure(invoice: Stripe.Invoice) {
  const stripeSubscriptionId = stripeId((invoice as unknown as { subscription?: unknown }).subscription);
  if (!stripeSubscriptionId) return null;
  const existing = await getSubscriptionEntitlementByStripeId(stripeSubscriptionId);
  if (!existing) return null;
  await saveSubscriptionEntitlement({ userId: existing.userId, offerKey: existing.offerKey, stripeCustomerId: existing.stripeCustomerId, stripeSubscriptionId, stripePriceId: existing.stripePriceId, status: "past_due", currentPeriodEnd: existing.currentPeriodEnd, graceEndsAt: gracePeriodEndsAt(), lastInvoiceId: invoice.id, lastPaidAt: existing.lastPaidAt, canceledAt: null });
  return existing.userId;
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const existing = await getSubscriptionEntitlementByStripeId(subscription.id);
  if (!existing) return null;
  await saveSubscriptionEntitlement({ userId: existing.userId, offerKey: existing.offerKey, stripeCustomerId: existing.stripeCustomerId, stripeSubscriptionId: subscription.id, stripePriceId: existing.stripePriceId, status: "canceled", currentPeriodEnd: existing.currentPeriodEnd, graceEndsAt: null, lastInvoiceId: existing.lastInvoiceId, lastPaidAt: existing.lastPaidAt, canceledAt: new Date() });
  return existing.userId;
}

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string" || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(400).json({ error: "Missing Stripe signature or webhook configuration" });
    let event: Stripe.Event;
    try { event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET); }
    catch (error) { console.error("[Stripe] Webhook signature verification failed", error); return res.status(400).json({ error: "Invalid Stripe signature" }); }
    try {
      const candidateUserId = event.type === "checkout.session.completed" ? Number((event.data.object as Stripe.Checkout.Session).client_reference_id) : null;
      const claim = await claimBillingWebhookEvent({ providerEventId: event.id, eventType: event.type, userId: Number.isInteger(candidateUserId) ? candidateUserId : null, providerCreatedAt: new Date(event.created * 1000) });
      if (!claim.claimed) return res.json({ received: true, duplicate: true });
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription") await handleSubscriptionCheckout(session); else await handleCompletedCheckout(session);
      }
      if (event.type === "invoice.paid") await handleInvoicePaid(event.data.object as Stripe.Invoice);
      if (event.type === "invoice.payment_failed") await handleInvoiceFailure(event.data.object as Stripe.Invoice);
      if (event.type === "customer.subscription.deleted") await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
      await completeBillingWebhookEvent(event.id, "processed");
      return res.json({ received: true });
    } catch (error) {
      console.error("[Stripe] Webhook processing failed", error);
      await completeBillingWebhookEvent(event.id, "failed", "projection_failed");
      return res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}
