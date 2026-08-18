import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { savePremiumEntitlement } from "../db";
import { isPremiumOfferKey } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function stripeId(value: string | Stripe.Customer | Stripe.PaymentIntent | Stripe.DeletedCustomer | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function handleCompletedCheckout(session: Stripe.Checkout.Session) {
  const userId = Number(session.client_reference_id);
  const offerKey = session.metadata?.offer_key;
  if (!Number.isInteger(userId) || !offerKey || !isPremiumOfferKey(offerKey) || session.payment_status !== "paid") {
    console.warn("[Stripe] Ignored checkout session with incomplete entitlement metadata", { sessionId: session.id });
    return;
  }
  await savePremiumEntitlement({
    userId,
    offerKey,
    stripeCustomerId: stripeId(session.customer),
    stripePaymentIntentId: stripeId(session.payment_intent),
    stripeCheckoutSessionId: session.id,
  });
}

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string" || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: "Missing Stripe signature or webhook configuration" });
    }
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      console.error("[Stripe] Webhook signature verification failed", error);
      return res.status(400).json({ error: "Invalid Stripe signature" });
    }
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }
    try {
      if (event.type === "checkout.session.completed") await handleCompletedCheckout(event.data.object as Stripe.Checkout.Session);
      console.log("[Stripe] Processed webhook", { type: event.type, id: event.id, created: event.created });
      return res.json({ received: true });
    } catch (error) {
      console.error("[Stripe] Webhook processing failed", error);
      return res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}
